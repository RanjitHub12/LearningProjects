package UI;

import MODEL.Publisher;
import javax.swing.*;
import java.awt.*;

public class AddPublisherDialog extends JDialog {
    private JTextField nameField = new JTextField();
    private JTextField addressField = new JTextField();
    private JTextField phoneField = new JTextField();
    private JTextField daysField = new JTextField();
    private Publisher publisher;

    public AddPublisherDialog(Frame owner) {
        super(owner, "Add New Publisher", true);
        setSize(400, 250);
        setLocationRelativeTo(owner);
        setLayout(new GridLayout(5, 2, 10, 10));
        getRootPane().setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        JButton submitButton = new JButton("Submit");
        JButton cancelButton = new JButton("Cancel");

        add(new JLabel("Name:"));
        add(nameField);
        add(new JLabel("Address:"));
        add(addressField);
        add(new JLabel("Phone Number:"));
        add(phoneField);
        add(new JLabel("Avg. Procurement Days:"));
        add(daysField);
        add(cancelButton);
        add(submitButton);

        submitButton.addActionListener(e -> {
            if (!nameField.getText().trim().isEmpty()) {
                try {
                    publisher = new Publisher();
                    publisher.setName(nameField.getText().trim());
                    publisher.setAddress(addressField.getText().trim());
                    publisher.setPhoneNumber(phoneField.getText().trim());
                    publisher.setAvgProcurementDays(Integer.parseInt(daysField.getText().trim()));
                    setVisible(false);
                } catch (NumberFormatException ex) {
                    JOptionPane.showMessageDialog(this, "Procurement days must be a number.", "Input Error", JOptionPane.ERROR_MESSAGE);
                }
            } else {
                JOptionPane.showMessageDialog(this, "Name cannot be empty.", "Input Error", JOptionPane.ERROR_MESSAGE);
            }
        });

        cancelButton.addActionListener(e -> {
            publisher = null;
            setVisible(false);
        });
    }

    public Publisher getPublisher() {
        return publisher;
    }
}