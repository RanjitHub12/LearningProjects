import heapq
import math

# --- HELPER FUNCTIONS ---
def approx(a, b, tol=1e-5):
    if a == float('inf') and b == float('inf'): return True
    if a == float('inf') or b == float('inf'): return False
    return abs(a - b) < tol

class Key:
    def __init__(self, k1, k2): self.k1, self.k2 = k1, k2
    def __lt__(self, other):
        if approx(self.k1, other.k1): return self.k2 < other.k2
        return self.k1 < other.k1

# --- NODE CLASS (DEFINED HERE) ---
class Node:
    def __init__(self, x, y):
        self.x, self.y = x, y
        self.pos = (x, y)
        self.g = float('inf'); self.rhs = float('inf')
        self.neighbors = []
        self.type = 'EMPTY'; self.crowd_density = 0 
        self.perceived_type = 'EMPTY'; self.perceived_crowd = 0; self.fire_risk = 0.0
        self.visited = False 
    def __lt__(self, other): return self.pos < other.pos
    def __repr__(self): return f"N{self.pos}"

# --- PATHFINDING CLASS (DEFINED HERE) ---
class DStarLite:
    def __init__(self, start, goals, windows, nodes_dict):
        self.start = start; self.goals = goals; self.windows = windows; self.nodes = nodes_dict
        self.km = 0.0; self.queue = []; self.in_queue = {}; self.fire_near_main_exits = False
        self.prev_fire_state = False

    def h(self, n): return abs(n.x - self.start.x) + abs(n.y - self.start.y)
    def calc_key(self, u):
        m = min(u.g, u.rhs); return Key(m + self.h(u) + self.km, m)

    def c(self, u, v):
        if u.perceived_type in ['FIRE', 'WALL', 'RUBBLE'] or v.perceived_type in ['FIRE', 'WALL', 'RUBBLE']: return float('inf')
        cost = 1.0
        if v.fire_risk > 0: cost += v.fire_risk
        if any(n.perceived_type == 'FIRE' for n in v.neighbors): cost += 100.0 
        if v in self.windows: cost += 1.0 if self.fire_near_main_exits else 200.0 
        if v.perceived_type == 'CROWD': cost += 10.0 * (v.perceived_crowd ** 2) 
        return cost

    def update_vertex(self, u):
        key = self.calc_key(u)
        if not approx(u.g, u.rhs):
            heapq.heappush(self.queue, (key, u)); self.in_queue[u] = key
        elif u in self.in_queue: del self.in_queue[u]

    def compute_shortest_path(self):
        while self.queue:
            k_old, u = self.queue[0]; k_start = self.calc_key(self.start)
            if u not in self.in_queue or (self.in_queue[u].k1 != k_old.k1 or self.in_queue[u].k2 != k_old.k2):
                heapq.heappop(self.queue); continue
            if k_old < k_start or self.start.rhs > self.start.g:
                heapq.heappop(self.queue)
                if u in self.in_queue: del self.in_queue[u]
                k_new = self.calc_key(u)
                if k_old < k_new: heapq.heappush(self.queue, (k_new, u)); self.in_queue[u] = k_new
                elif u.g > u.rhs:
                    u.g = u.rhs
                    for s in u.neighbors:
                        if s.perceived_type != 'RUBBLE': s.rhs = min(s.rhs, self.c(s, u) + u.g); self.update_vertex(s)
                else:
                    g_old = u.g; u.g = float('inf')
                    for s in u.neighbors + [u]:
                        if approx(s.rhs, self.c(s, u) + g_old):
                            if s.perceived_type != 'RUBBLE' and s not in self.goals:
                                s.rhs = float('inf')
                                for sp in s.neighbors: s.rhs = min(s.rhs, self.c(s, sp) + sp.g)
                        self.update_vertex(s)
            else: break

    def initialize(self):
        self.km = 0; self.queue = []; self.in_queue = {}
        for n in self.nodes.values(): n.g = float('inf'); n.rhs = float('inf')
        targets = [t for t in (self.goals + self.windows) if t.perceived_type != 'RUBBLE']
        for target in targets:
            target.rhs = 100.0 if (target in self.windows and not self.fire_near_main_exits) else 0.0
            key = self.calc_key(target); heapq.heappush(self.queue, (key, target)); self.in_queue[target] = key
        self.compute_shortest_path()

    def update_map(self, changed_nodes):
        for u in changed_nodes:
            if u.perceived_type == 'FIRE':
                for g in self.goals:
                    if math.hypot(u.x - g.x, u.y - g.y) < 5.0: self.fire_near_main_exits = True
        if self.fire_near_main_exits != self.prev_fire_state:
            self.prev_fire_state = self.fire_near_main_exits
            for w in self.windows:
                self.update_vertex(w)
                for n in w.neighbors:
                    if n.perceived_type != 'RUBBLE': n.rhs = min(n.rhs, self.c(n, w) + w.g); self.update_vertex(n)
        for u in changed_nodes:
            if u.perceived_type in ['RUBBLE', 'WALL', 'FIRE']: u.g = float('inf'); u.rhs = float('inf')
            for s in u.neighbors + [u]:
                if s.perceived_type != 'RUBBLE':
                    if s not in self.goals:
                        s.rhs = float('inf')
                        for sp in s.neighbors: s.rhs = min(s.rhs, self.c(s, sp) + sp.g)
                self.update_vertex(s)
        self.compute_shortest_path()

    def get_distance_to_exit(self):
        return self.start.g if self.start.g != float('inf') else 0.0

    def move_agent(self):
        if self.start.rhs == float('inf'): return None
        best, min_c = None, float('inf')
        for n in self.start.neighbors:
            edge_cost = self.c(self.start, n)
            if edge_cost == float('inf'): continue
            if edge_cost + n.g < min_c: min_c = edge_cost + n.g; best = n
        if best and min_c != float('inf'): self.km += self.h(best); self.start = best; return best
        return None

    # --- VISUALIZATION: GET FULL PATH ---
    def get_whole_path(self):
        """Reconstructs the full optimal path from start to goal for visualization."""
        if self.start.g == float('inf'): return []
        
        path = [self.start]
        curr = self.start
        visited = {curr}
        
        # Limit path length to prevent infinite loops in weird edge cases
        for _ in range(200):
            if curr in self.goals or curr in self.windows: break
            
            best = None
            min_val = float('inf')
            
            for n in curr.neighbors:
                edge_cost = self.c(curr, n)
                if edge_cost == float('inf'): continue
                
                # Gradient Descent: Cost to neighbor + neighbor's cost to goal
                val = edge_cost + n.g
                if val < min_val:
                    min_val = val
                    best = n
            
            if best and best not in visited:
                path.append(best)
                visited.add(best)
                curr = best
            else:
                break
        
        return path

    # --- ADVANCED NAVIGATION (2-STEP LOOKAHEAD) ---
    def get_navigation_data(self):
        if self.start.rhs == float('inf'): return "WAIT", 0, "No Path", 0
        
        # 1. Extract Path (Deep Lookahead)
        path = [self.start]; curr = self.start
        for _ in range(50): # Look 50m ahead
            best = None; min_c = float('inf')
            for n in curr.neighbors:
                c = self.c(curr, n)
                if c != float('inf') and c + n.g < min_c: min_c = c + n.g; best = n
            if best and best != curr:
                path.append(best); curr = best
                if best in self.goals or best in self.windows: break
            else: break
            
        if len(path) < 2: return "ARRIVED", 0, "Done", 0

        # 2. Analyze Segment 1 (Current Straight Line)
        p0, p1 = path[0], path[1]
        vec1 = (p1.x - p0.x, p1.y - p0.y)
        
        def get_dir_name(v):
            if v == (0, 1): return "UP"
            if v == (0, -1): return "DOWN"
            if v == (1, 0): return "RIGHT"
            if v == (-1, 0): return "LEFT"
            return "WAIT"

        cur_dir = get_dir_name(vec1)
        cur_dist = 0
        pivot_idx = -1

        for i in range(len(path) - 1):
            v_temp = (path[i+1].x - path[i].x, path[i+1].y - path[i].y)
            if v_temp == vec1:
                cur_dist += 1
                pivot_idx = i + 1
            else:
                break # Turn detected
        
        # 3. Analyze Segment 2 (The Next Step)
        next_action = "Arrive"
        next_dist = 0
        
        if pivot_idx < len(path) - 1:
            p_pivot = path[pivot_idx]
            p_next = path[pivot_idx+1]
            vec2 = (p_next.x - p_pivot.x, p_next.y - p_pivot.y)
            
            # Determine Turn Direction
            dx1, dy1 = vec1
            dx2, dy2 = vec2
            cross = dx1*dy2 - dy1*dx2
            
            if cross > 0: next_action = "Turn LEFT"
            elif cross < 0: next_action = "Turn RIGHT"
            
            # Calculate distance of the *next* segment
            for i in range(pivot_idx, len(path)-1):
                v_temp = (path[i+1].x - path[i].x, path[i+1].y - path[i].y)
                if v_temp == vec2:
                    next_dist += 1
                else:
                    break
        
        return cur_dir, cur_dist, next_action, next_dist