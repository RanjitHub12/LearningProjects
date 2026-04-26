import random
import math
from collections import deque
from algorithms import Node, DStarLite 
from sensors import PDRSystem
from layout import LayoutManager
from PIL import Image
import numpy as np

class Simulation:
    def generate_from_image(self, image_file):
        img = Image.open(image_file).convert('RGB')
        img = img.resize((self.size, self.size))
        img_array = np.array(img)

        self.goals = []
        self.windows = []

        for y in range(self.size):
            for x in range(self.size):
                r, g, b = img_array[self.size - 1 - y, x]
                node = self.grid[(x, y)]
                
                if r < 50 and g < 50 and b < 50:
                    node.type = 'WALL'
                elif g > 150 and r < 100 and b < 100:
                    node.type = 'EMPTY'
                    self.goals.append(node)
                elif b > 150 and r < 100 and g < 150:
                    node.type = 'WINDOW'
                    self.windows.append(node)
                else:
                    node.type = 'EMPTY'

    def __init__(self, size=60, layout_mgr=None):
        self.solver = None
        self.size = size
        self.grid = {}
        self.nodes_list = []
        self.layout_mgr = layout_mgr
        
        for x in range(size):
            for y in range(size):
                n = Node(x, y)
                self.grid[(x,y)] = n
                self.nodes_list.append(n)
        
        directions = [(-1, 0), (1, 0), (0, -1), (0, 1)] 
        for n in self.nodes_list:
            for dx, dy in directions:
                nx, ny = n.x+dx, n.y+dy
                if (nx, ny) in self.grid: n.neighbors.append(self.grid[(nx, ny)])

        self.goals = []
        self.windows = []
        
        loaded = False
        if self.layout_mgr:
            data = self.layout_mgr.load_layout()
            if data and data[0] == size:
                _, walls, windows, exits = data
                for pos in walls: self.grid[pos].type = 'WALL'
                for pos in windows: 
                    self.grid[pos].type = 'WINDOW'
                    self.windows.append(self.grid[pos])
                for pos in exits: 
                    self.grid[pos].type = 'EMPTY'
                    self.goals.append(self.grid[pos])
                loaded = True
        
        if not loaded:
            self.generate_building_plan()
            if self.layout_mgr: self.layout_mgr.save_layout(self.grid, size)

        self.hidden_hazards = set()
        self.sensors = [] 
        self.setup_sensors() 
        
        valid_spawns = [n for n in self.nodes_list if n.type == 'EMPTY' and n not in self.goals and n not in self.windows]
        self.start_node = random.choice(valid_spawns)
        
        self.pdr = PDRSystem(self.start_node.x, self.start_node.y)
        self.pdr_trace = []

        self.crowd_agents = [] 
        num_people = int((size * size) * 0.05) 
        for _ in range(num_people):
            n = self.grid[(random.randint(0, size-1), random.randint(0, size-1))]
            if n.type == 'EMPTY' and n != self.start_node and n not in self.goals:
                n.type = 'CROWD'
                self.crowd_agents.append({'node': n, 'has_app': random.random() < 0.05})
        
        self.flow_field_crowd = {}
        self.flow_field_app = {}
        self.compute_flow_field()
        
        for n in self.nodes_list:
            n.perceived_type = 'WALL' if n.type == 'WALL' else 'EMPTY'
        for g in self.goals: g.perceived_type = g.type
        for w in self.windows: w.perceived_type = w.type

        self.solver = DStarLite(self.start_node, self.goals, self.windows, self.grid)
        self.solver.initialize()
        
        self.steps = 0; self.escaped = False; self.trapped = False
        self.fire_front = []; self.panic_mode = False; self.has_ignited = False
        self.dist_to_exit = 0.0
        self.casualties = 0; self.window_usage_count = 0
        
        self.instruction = "READY"
        self.dist_to_turn = 0
        self.next_action = "Wait"
        self.next_dist = 0
        self.feedback_log = "System Standard"

        self.ghost_paths = [] 
        self.map_changed_for_flow = True 

    def snapshot_path(self):
        if hasattr(self.solver, 'get_whole_path'):
            path_nodes = self.solver.get_whole_path()
            if path_nodes and len(path_nodes) > 1:
                coords = [(n.x, n.y) for n in path_nodes]
                self.ghost_paths.append(coords)
                if len(self.ghost_paths) > 8:
                    self.ghost_paths.pop(0)

    # --- VISUALIZER: Extracts dynamic alt paths without modifying D*Lite logic ---
    def get_alternative_routes(self):
        alt_routes = []
        if not self.panic_mode or not hasattr(self, 'flow_field_app'):
            return alt_routes

        main_path = []
        if hasattr(self.solver, 'get_whole_path'):
            main_path = self.solver.get_whole_path()
        
        main_second_node = main_path[1] if main_path and len(main_path) > 1 else None
        safe_targets = self.goals + self.windows

        for n in self.start_node.neighbors:
            if n.type in ['WALL', 'FIRE', 'RUBBLE']: continue
            if n == main_second_node: continue
            
            route = [self.start_node, n]
            curr = n
            steps = 0
            
            while curr not in safe_targets and steps < 150:
                best_next = None
                best_val = self.flow_field_app.get(curr, float('inf'))
                
                for nb in curr.neighbors:
                    if nb.type in ['WALL', 'FIRE', 'RUBBLE']: continue
                    val = self.flow_field_app.get(nb, float('inf'))
                    if val < best_val:
                        best_val = val
                        best_next = nb
                        
                if best_next and best_next not in route:
                    route.append(best_next)
                    curr = best_next
                else:
                    break 
                steps += 1
            
            if route[-1] in safe_targets:
                coords = [(node.x, node.y) for node in route]
                alt_routes.append(coords)
                
        return alt_routes

    def generate_building_plan(self):
        def draw_wall(x1, x2, y1, y2):
            for x in range(min(x1, x2), max(x1, x2) + 1):
                for y in range(min(y1, y2), max(y1, y2) + 1):
                    if (x, y) in self.grid: self.grid[(x, y)].type = 'WALL'
        def punch_door(x, y, width=2, vertical=False):
            for i in range(width):
                if vertical and (x, y+i) in self.grid: self.grid[(x, y+i)].type = 'EMPTY'
                elif not vertical and (x+i, y) in self.grid: self.grid[(x+i, y)].type = 'EMPTY'
        
        draw_wall(0, 59, 0, 0); draw_wall(0, 59, 59, 59); draw_wall(0, 0, 0, 59); draw_wall(59, 59, 0, 59)
        draw_wall(1, 25, 27, 27); draw_wall(33, 58, 27, 27); draw_wall(1, 25, 32, 32); draw_wall(33, 58, 32, 32)
        draw_wall(25, 25, 1, 27); draw_wall(25, 25, 32, 58); draw_wall(32, 32, 1, 27); draw_wall(32, 32, 32, 58)
        draw_wall(1, 25, 45, 45); punch_door(25, 38, vertical=True); punch_door(25, 50, vertical=True) 
        draw_wall(32, 58, 45, 45); draw_wall(45, 45, 32, 58); punch_door(32, 38, vertical=True); punch_door(32, 50, vertical=True)
        punch_door(38, 45, width=2); punch_door(50, 45, width=2); draw_wall(1, 12, 12, 12); draw_wall(12, 12, 1, 12)
        punch_door(25, 12, vertical=True); punch_door(6, 12, width=2); draw_wall(42, 42, 1, 27); draw_wall(32, 42, 8, 8)
        draw_wall(32, 42, 16, 16); draw_wall(42, 58, 12, 12); draw_wall(42, 58, 20, 20); punch_door(42, 4, vertical=True)
        punch_door(42, 12, vertical=True); punch_door(42, 20, vertical=True); punch_door(42, 6, vertical=True)
        punch_door(42, 16, vertical=True); punch_door(42, 24, vertical=True); punch_door(32, 12, vertical=True)
        
        exits_coords = [(0, 28), (0, 29), (0, 30), (0, 31), (59, 28), (59, 29), (59, 30), (59, 31), (28, 0), (29, 0), (30, 0), (31, 0), (28, 59), (29, 59), (30, 59), (31, 59)]
        for ex, ey in exits_coords:
            if (ex, ey) in self.grid: self.grid[(ex, ey)].type = 'EMPTY'; self.goals.append(self.grid[(ex, ey)])
        
        window_coords = []
        for i in range(5, 55, 8):
            if i not in [27, 28, 29, 30, 31, 32]: window_coords.extend([(0, i), (59, i), (i, 0), (i, 59)])
        for wx, wy in window_coords:
            if (wx, wy) in self.grid and self.grid[(wx, wy)] not in self.goals: self.grid[(wx, wy)].type = 'WINDOW'; self.windows.append(self.grid[(wx, wy)])

    def setup_sensors(self):
        for x in range(2, self.size, 6): 
            for y in range(2, self.size, 6):
                if (x, y) in self.grid and self.grid[(x,y)].type != 'WALL':
                    self.grid[(x,y)].has_sensor = True; self.sensors.append(self.grid[(x,y)])

    def process_sensor_data(self):
        updates = set()
        detected_fires = set()
        sensor_range = 5
        sensor_range_sq = 25 
        
        for s in self.sensors:
            for fire_node in self.fire_front:
                dx = s.x - fire_node.x
                if abs(dx) > sensor_range: continue
                
                dy = s.y - fire_node.y
                if abs(dy) > sensor_range: continue
                
                if (dx * dx + dy * dy) <= sensor_range_sq:
                    if fire_node.perceived_type != 'FIRE':
                        fire_node.perceived_type = 'FIRE'
                        updates.add(fire_node)
                    detected_fires.add(fire_node)
        
        for fire in detected_fires:
            queue = deque([(fire, 0)])
            visited = {fire}
            while queue:
                curr, depth = queue.popleft()
                if depth >= 4: continue
                for neighbor in curr.neighbors:
                    if neighbor not in visited and neighbor.type != 'WALL':
                        visited.add(neighbor)
                        risk_penalty = 50.0 / (depth + 1)
                        if risk_penalty > neighbor.fire_risk:
                            neighbor.fire_risk = risk_penalty; updates.add(neighbor) 
                        queue.append((neighbor, depth + 1))
        
        if updates: 
            self.snapshot_path()
            self.solver.update_map(list(updates))

    def check_line_of_sight(self, target):
        x0, y0 = self.start_node.x, self.start_node.y
        x1, y1 = target.x, target.y
        dx = x1 - x0
        dy = y1 - y0
        
        dist_sq = dx * dx + dy * dy
        if dist_sq > 225: return False 
        
        dist = math.sqrt(dist_sq)
        steps = int(dist)
        if steps == 0: return True
        
        step_inv = 1.0 / steps
        for i in range(1, steps):
            t = i * step_inv
            cx = int(x0 + t * dx)
            cy = int(y0 + t * dy)
            if self.grid[(cx, cy)].type == 'WALL': return False 
        return True

    def ignite_and_spread(self, allow_random_ignition=True):
        updates = []; should_ignite = False
        
        if allow_random_ignition:
            if not self.has_ignited:
                if random.random() < 0.15: should_ignite = True
            else:
                if random.random() < 0.05: should_ignite = True
                
        if should_ignite: 
            rx, ry = random.randint(1, self.size-2), random.randint(1, self.size-2)
            s = self.grid[(rx, ry)]
            if s.type == 'EMPTY' and s != self.start_node:
                s.type = 'FIRE'; self.fire_front.append(s); updates.append(s); self.has_ignited = True
        
        new_fire = []
        for f in self.fire_front:
            for n in f.neighbors:
                if n.type != 'FIRE' and n.type != 'WALL' and n.type != 'RUBBLE' and n not in self.goals:
                    if random.random() < 0.60: 
                        for agent in self.crowd_agents:
                            if agent['node'] == n: 
                                self.casualties += 1
                                agent['node'] = None
                        n.type = 'FIRE'
                        new_fire.append(n)
                        updates.append(n)
                        self.crowd_agents = [c for c in self.crowd_agents if c['node'] is not None]
                    elif random.random() < 0.80 and n.type == 'EMPTY':
                        n.type = 'SMOKE'
                        updates.append(n)
        self.fire_front.extend(new_fire)
        
        if updates: self.map_changed_for_flow = True
            
        return updates

    def compute_flow_field(self):
        self.flow_field_crowd = {n: float('inf') for n in self.nodes_list}
        q = deque([e for e in self.goals if e.type != 'RUBBLE'])
        q.extend([e for e in self.windows if e.type != 'RUBBLE'])
        
        for e in q: self.flow_field_crowd[e] = 0
        while q:
            curr = q.popleft()
            for n in curr.neighbors:
                if n.type not in ['WALL', 'RUBBLE', 'FIRE'] and self.flow_field_crowd[n] == float('inf'):
                    self.flow_field_crowd[n] = self.flow_field_crowd[curr] + 1
                    q.append(n)

        self.flow_field_app = {n: float('inf') for n in self.nodes_list}
        fire_near = self.solver.fire_near_main_exits if self.solver else False
        
        q_app = deque([g for g in self.goals if g.type != 'RUBBLE'])
        if fire_near: 
            q_app.extend([w for w in self.windows if w.type != 'RUBBLE'])
            
        for t in q_app: self.flow_field_app[t] = 0
        while q_app:
            curr = q_app.popleft()
            for n in curr.neighbors:
                if n.type not in ['WALL', 'RUBBLE', 'FIRE'] and self.flow_field_app[n] == float('inf'):
                    self.flow_field_app[n] = self.flow_field_app[curr] + 1
                    q_app.append(n)

    def move_crowds(self):
        updates = []
        if self.panic_mode: 
            if getattr(self, 'map_changed_for_flow', True):
                self.compute_flow_field()
                self.map_changed_for_flow = False
                
        safe_targets = self.goals + self.windows
        
        for agent in self.crowd_agents:
            curr = agent['node']
            if curr.type == 'FIRE': continue 
            
            valid = [n for n in curr.neighbors if n.type == 'EMPTY' or n in safe_targets]
            if not valid: continue
            
            target = None
            if self.panic_mode:
                field = self.flow_field_app if agent['has_app'] else self.flow_field_crowd
                target = min(valid, key=lambda n: field.get(n, float('inf')))
            else:
                target = random.choice(valid) if random.random() < 0.3 else None
            
            if target:
                if target in safe_targets:
                      curr.type = 'EMPTY'
                      updates.append(curr)
                      agent['node'] = None
                      self.window_usage_count += 1
                elif target.type == 'EMPTY':
                    curr.type = 'EMPTY'
                    target.type = 'CROWD'
                    agent['node'] = target
                    updates.extend([curr, target])
                    
        self.crowd_agents = [a for a in self.crowd_agents if a['node'] is not None]
        return updates

    def toggle_fire(self, target_pos=None):
        f = None
        if target_pos:
            tx, ty = target_pos
            if (tx, ty) in self.grid and self.grid[(tx, ty)].type != 'WALL':
                f = self.grid[(tx, ty)]
        else:
            valid = [n for n in self.nodes_list if n.type == 'EMPTY' and n != self.start_node]
            if valid:
                f = random.choice(valid)
        
        if f:
            f.type = 'FIRE' 
            self.fire_front.append(f)
            self.panic_mode = True
            self.map_changed_for_flow = True 
            return True
        return False

    def step(self, manual_move=None, allow_fire=True):
        prev_node = self.start_node 
        
        if len(self.fire_front) > 0: self.panic_mode = True
        
        if (self.start_node in self.goals or self.start_node in self.windows) and self.start_node.type != 'RUBBLE':
            self.escaped = True
            self.instruction = "ESCAPED"
            self.dist_to_exit = 0.0
            return

        if self.steps % 5 == 0: 
             self.snapshot_path()
             
        self.ignite_and_spread(allow_random_ignition=allow_fire)
        self.move_crowds()
        self.process_sensor_data() 
        
        for n in self.nodes_list: n.crowd_density = 0
        for agent in self.crowd_agents:
            n = agent['node']
            count = sum(1 for nb in n.neighbors if nb.type == 'CROWD')
            n.crowd_density = count

        perception_updates = []
        
        x0, y0 = self.start_node.x, self.start_node.y
        min_x = max(0, x0 - 15)
        max_x = min(self.size - 1, x0 + 15)
        min_y = max(0, y0 - 15)
        max_y = min(self.size - 1, y0 + 15)

        for y in range(min_y, max_y + 1):
            for x in range(min_x, max_x + 1):
                n = self.grid[(x, y)]
                if self.check_line_of_sight(n):
                    n.visited = True
                    n.perceived_crowd = n.crowd_density
                    
                    actual = n.type 
                    if n.type == 'CROWD': actual = 'EMPTY' 
                    
                    if n.perceived_type != actual:
                        if n.type == 'FIRE': 
                            n.perceived_type = 'FIRE'
                            perception_updates.append(n)
                        elif n.perceived_type != actual:
                            n.perceived_type = actual
                            perception_updates.append(n)

        if perception_updates: 
            self.snapshot_path()
            self.solver.update_map(perception_updates)
        
        if manual_move:
            dx, dy = manual_move
            nx, ny = self.start_node.x + dx, self.start_node.y + dy
            if (nx, ny) in self.grid and self.grid[(nx, ny)].type != 'WALL':
                self.start_node = self.grid[(nx, ny)]
                self.solver.start = self.start_node
                self.solver.km += self.solver.h(self.start_node)
        elif self.panic_mode:
            next_n = self.solver.move_agent()
            self.dist_to_exit = self.solver.get_distance_to_exit()
            
            if next_n: 
                self.start_node = next_n
                heading, dist, action, next_d = self.solver.get_navigation_data()
                self.instruction = heading
                self.dist_to_turn = dist
                self.next_action = action
                self.next_dist = next_d
                
                if "Turn" in action and dist <= 3:
                    self.feedback_log = f"📳 PREPARE: {action}"
                else:
                    self.feedback_log = "Scanning..."
            else: 
                self.trapped = True
                self.instruction = "STOP!"
        
        accel, gyro = self.pdr.simulate_hardware_reading(prev_node, self.start_node)
        est_x, est_y = self.pdr.update_estimate(accel, gyro)
        self.pdr_trace.append((est_x, est_y))
        if len(self.pdr_trace) > 20: self.pdr_trace.pop(0)

        self.steps += 1