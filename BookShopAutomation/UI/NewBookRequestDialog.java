package UI;

import MODEL.BookRequest;
import javax.swing.*;
import java.awt.*;

public class NewBookRequestDialog extends JDialog {
    private JTextField titleField;
    private JTextField authorField;
    private JTextField isbnField;
    private BookRequest bookRequest;

    public NewBookRequestDialog(Frame owner, String initialTitle) {
        super(owner, "Log New Book Request", true);
        setSize(400, 250);
        setLocationRelativeTo(owner);
        setLayout(new GridLayout(4, 2, 10, 10));
        getRootPane().setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        titleField = new JTextField(initialTitle);
        authorField = new JTextField();
        isbnField = new JTextField();
        JButton submitButton = new JButton("Submit Request");
        JButton cancelButton = new JButton("Cancel");

        add(new JLabel("Book Title:"));
        add(titleField);
        add(new JLabel("Author:"));
        add(authorField);
        add(new JLabel("ISBN (if known):"));
        add(isbnField);
        add(cancelButton);
        add(submitButton);

        submitButton.addActionListener(e -> {
            if (!titleField.getText().trim().isEmpty()) {
                bookRequest = new BookRequest();
                bookRequest.setBookTitle(titleField.getText().trim());
                bookRequest.setBookAuthor(authorField.getText().trim());
                bookRequest.setIsbn(isbnField.getText().trim());
                bookRequest.setCustomerId(1);
                setVisible(false);
            } else {
                JOptionPane.showMessageDialog(this, "Title cannot be empty.", "Input Error", JOptionPane.ERROR_MESSAGE);
            }
        });

        cancelButton.addActionListener(e -> {
            bookRequest = null;
            setVisible(false);
        });
    }

    public BookRequest getBookRequest() {
        return bookRequest;
    }
}