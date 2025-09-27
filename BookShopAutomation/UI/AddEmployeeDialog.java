package UI;

import MODEL.Employee;
import javax.swing.*;
import java.awt.*;

public class AddEmployeeDialog extends JDialog {
    private JTextField nameField = new JTextField();
    private JTextField roleField = new JTextField();
    private Employee employee;

    public AddEmployeeDialog(Frame owner) {
        super(owner, "Add New Employee", true);
        setSize(400, 200);
        setLocationRelativeTo(owner);
        setLayout(new GridLayout(3, 2, 10, 10));
        
        JButton submitButton = new JButton("Submit");
        JButton cancelButton = new JButton("Cancel");

        add(new JLabel("Name (Required):"));
        add(nameField);
        add(new JLabel("Role (Manager/Clerk):"));
        add(roleField);
        add(cancelButton);
        add(submitButton);

        submitButton.addActionListener(e -> {
            if (!nameField.getText().trim().isEmpty()) {
                employee = new Employee();
                employee.setName(nameField.getText().trim());
                employee.setRole(roleField.getText().trim());
                setVisible(false);
            } else {
                JOptionPane.showMessageDialog(this, "Name cannot be empty.", "Input Error", JOptionPane.ERROR_MESSAGE);
            }
        });

        cancelButton.addActionListener(e -> {
            employee = null;
            setVisible(false);
        });
    }

    public Employee getEmployee() {
        return employee;
    }
}