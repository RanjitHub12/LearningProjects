package UI;

import MODEL.Customer;
import javax.swing.*;
import java.awt.*;

public class AddCustomerDialog extends JDialog {
    private JTextField nameField = new JTextField();
    private JTextField phoneField = new JTextField();
    private Customer customer;

    public AddCustomerDialog(Frame owner) {
        super(owner, "Add New Customer", true);
        setSize(400, 200);
        setLocationRelativeTo(owner);
        setLayout(new GridLayout(3, 2, 10, 10));
        getRootPane().setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        JButton submitButton = new JButton("Submit");
        JButton cancelButton = new JButton("Cancel");

        add(new JLabel("Name (Required):"));
        add(nameField);
        add(new JLabel("Phone Number:"));
        add(phoneField);
        add(cancelButton);
        add(submitButton);

        submitButton.addActionListener(e -> {
            if (!nameField.getText().trim().isEmpty()) {
                customer = new Customer();
                customer.setName(nameField.getText().trim());
                customer.setPhoneNumber(phoneField.getText().trim());
                setVisible(false); // Close the dialog
            } else {
                JOptionPane.showMessageDialog(this, "Name cannot be empty.", "Input Error", JOptionPane.ERROR_MESSAGE);
            }
        });

        cancelButton.addActionListener(e -> {
            customer = null; // Ensure no customer is returned
            setVisible(false); // Close the dialog
        });
    }

    /**
     * This method is called by the MainFrame to get the customer details
     * after the dialog is closed.
     * @return The new Customer object, or null if cancelled.
     */
    public Customer getCustomer() {
        return customer;
    }
}