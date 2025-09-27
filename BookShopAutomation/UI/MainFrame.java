package UI;

import DAO.*;
import MODEL.*;
import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

public class MainFrame extends JFrame {

    private final JTabbedPane tabbedPane;
    
    // DAO instances
    private final BookDAO bookDAO = new BookDAO();
    private final SaleDAO saleDAO = new SaleDAO();
    private final BookRequestDAO bookRequestDAO = new BookRequestDAO();
    private final ReportDAO reportDAO = new ReportDAO();
    private final CustomerDAO customerDAO = new CustomerDAO();
    private final PublisherDAO publisherDAO = new PublisherDAO();
    // private final EmployeeDAO employeeDAO = new EmployeeDAO();

    // In-memory list for the current sale
    private final List<Book> currentSaleItems = new ArrayList<>();
    private double currentSaleTotal = 0.0;

    public MainFrame() {
        setTitle("Bookshop Automation System");
        setSize(950, 700);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null);

        tabbedPane = new JTabbedPane();
        
        // Add all the panels as tabs
        tabbedPane.addTab("Search", createSearchPanel());
        tabbedPane.addTab("Point of Sale", createSalesPanel());
        tabbedPane.addTab("Manager View", createManagerPanel());
        tabbedPane.addTab("Management", createManagementPanel());

        add(tabbedPane);
    }

    private JPanel createSearchPanel() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        JTextField searchField = new JTextField();
        JButton searchTitleButton = new JButton("Search by Title");
        JButton searchAuthorButton = new JButton("Search by Author");
        JTextArea resultArea = new JTextArea();
        resultArea.setFont(new Font("Monospaced", Font.PLAIN, 14));
        resultArea.setEditable(false);
        
        JPanel topPanel = new JPanel(new BorderLayout(5, 5));
        topPanel.add(new JLabel("Search Query:"), BorderLayout.WEST);
        topPanel.add(searchField, BorderLayout.CENTER);
        
        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        buttonPanel.add(searchTitleButton);
        buttonPanel.add(searchAuthorButton);
        topPanel.add(buttonPanel, BorderLayout.EAST);
        
        panel.add(topPanel, BorderLayout.NORTH);
        panel.add(new JScrollPane(resultArea), BorderLayout.CENTER);

        searchTitleButton.addActionListener(e -> {
            String query = searchField.getText();
            if (query == null || query.trim().isEmpty()) return;
            Book book = bookDAO.findBookByTitle(query);
            displayBookSearchResult(book, resultArea, query);
        });

        searchAuthorButton.addActionListener(e -> {
            String query = searchField.getText();
            if (query == null || query.trim().isEmpty()) return;
            Book book = bookDAO.findBookByAuthor(query);
            displayBookSearchResult(book, resultArea, query);
        });
        return panel;
    }

    private void displayBookSearchResult(Book book, JTextArea resultArea, String query) {
        if (book != null) {
            resultArea.setText(String.format(
                "Book Found!\n\n%-20s: %s\n%-20s: %s\n%-20s: %s\n%-20s: $%.2f\n%-20s: %.2f%%\n%-20s: %d\n%-20s: %s",
                "ISBN", book.getIsbn(),
                "Title", book.getTitle(),
                "Author", book.getAuthor(),
                "Price", book.getPrice(),
                "Discount", book.getDiscountPercentage(),
                "Copies in Stock", book.getQuantityInStock(),
                "Rack Number", book.getRackNumber()
            ));
        } else {
            resultArea.setText("No book found for the query: '" + query + "'");
            int option = JOptionPane.showConfirmDialog(this, "Book not found. Would you like to log a detailed request?", "Log Request", JOptionPane.YES_NO_OPTION);
            if (option == JOptionPane.YES_OPTION) {
                NewBookRequestDialog dialog = new NewBookRequestDialog(this, query);
                dialog.setVisible(true);
                BookRequest request = dialog.getBookRequest();
                if (request != null && bookRequestDAO.createRequest(request)) {
                    JOptionPane.showMessageDialog(this, "Request logged successfully.");
                } else if (request != null) {
                    JOptionPane.showMessageDialog(this, "Failed to log request.", "Error", JOptionPane.ERROR_MESSAGE);
                }
            }
        }
    }

    private JPanel createSalesPanel() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        JTextField isbnField = new JTextField(15);
        JButton addToSaleButton = new JButton("Add Book to Sale");
        JTextArea receiptArea = new JTextArea();
        receiptArea.setFont(new Font("Monospaced", Font.PLAIN, 14));
        receiptArea.setEditable(false);
        JButton finalizeSaleButton = new JButton("Finalize Sale");
        
        JPanel topPanel = new JPanel();
        topPanel.add(new JLabel("Enter ISBN:"));
        topPanel.add(isbnField);
        topPanel.add(addToSaleButton);
        
        panel.add(topPanel, BorderLayout.NORTH);
        panel.add(new JScrollPane(receiptArea), BorderLayout.CENTER);
        panel.add(finalizeSaleButton, BorderLayout.SOUTH);

        addToSaleButton.addActionListener(e -> {
            String isbn = isbnField.getText();
            if (isbn == null || isbn.trim().isEmpty()) return;
            Book book = bookDAO.findBookByIsbn(isbn);
            if (book != null && book.getQuantityInStock() > 0) {
                currentSaleItems.add(book);
                double priceAfterDiscount = book.getPrice() * (1 - book.getDiscountPercentage() / 100.0);
                currentSaleTotal += priceAfterDiscount;
                updateReceiptArea(receiptArea);
                isbnField.setText("");
            } else {
                JOptionPane.showMessageDialog(this, "Book not found or is out of stock.", "Error", JOptionPane.ERROR_MESSAGE);
            }
        });

        finalizeSaleButton.addActionListener(e -> {
            if (currentSaleItems.isEmpty()) return;
            Sale sale = new Sale();
            sale.setCustomerId(1); // Hardcoded: Consider adding a customer selection dropdown
            sale.setEmployeeId(1); // Hardcoded: Consider adding employee login
            sale.setTotalAmount(currentSaleTotal);
            
            List<SaleItem> items = new ArrayList<>();
            for (Book book : currentSaleItems) {
                SaleItem item = new SaleItem();
                item.setBookIsbn(book.getIsbn());
                item.setQuantity(1); // Assuming 1 copy per scan
                double priceAfterDiscount = book.getPrice() * (1 - book.getDiscountPercentage() / 100.0);
                item.setPriceAtTimeOfSale(priceAfterDiscount);
                items.add(item);
            }
            sale.setSaleItems(items);
            
            if (saleDAO.createSale(sale)) {
                JOptionPane.showMessageDialog(this, "Sale completed successfully!");
                currentSaleItems.clear();
                currentSaleTotal = 0.0;
                updateReceiptArea(receiptArea);
            } else {
                JOptionPane.showMessageDialog(this, "Sale failed. Stock might not be available.", "Transaction Error", JOptionPane.ERROR_MESSAGE);
            }
        });
        return panel;
    }

    private void updateReceiptArea(JTextArea receiptArea) {
        StringBuilder sb = new StringBuilder("--- CURRENT SALE ---\n\n");
        sb.append(String.format("%-30s %-10s %-10s %-10s\n", "Title", "Price", "Discount", "Final"));
        sb.append("----------------------------------------------------------------------\n");
        for (Book book : currentSaleItems) {
            double finalPrice = book.getPrice() * (1 - book.getDiscountPercentage() / 100.0);
            sb.append(String.format("%-30s $%-9.2f %-9.2f%% $%-9.2f\n",
                book.getTitle(),
                book.getPrice(),
                book.getDiscountPercentage(),
                finalPrice));
        }
        sb.append("\n----------------------------------------------------------------------\n");
        sb.append(String.format("%-52s $%.2f\n", "TOTAL:", currentSaleTotal));
        receiptArea.setText(sb.toString());
    }

    private JPanel createManagerPanel() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        JTable reportTable = new JTable();

        JPanel topPanel = new JPanel();
        topPanel.setLayout(new BoxLayout(topPanel, BoxLayout.Y_AXIS));

        JPanel stockPanel = new JPanel(new GridBagLayout());
        stockPanel.setBorder(BorderFactory.createTitledBorder("Add or Update Book Details"));
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(5, 5, 5, 5);
        gbc.fill = GridBagConstraints.HORIZONTAL;

        gbc.gridx = 0; gbc.gridy = 0;
        stockPanel.add(new JLabel("ISBN (Required):"), gbc);
        gbc.gridx = 1; gbc.gridwidth = 3;
        JTextField isbnField = new JTextField(20);
        stockPanel.add(isbnField, gbc);

        gbc.gridx = 0; gbc.gridy = 1; gbc.gridwidth = 1;
        stockPanel.add(new JLabel("Title:"), gbc);
        gbc.gridx = 1;
        JTextField titleField = new JTextField(15);
        stockPanel.add(titleField, gbc);
        gbc.gridx = 2;
        stockPanel.add(new JLabel("Author:"), gbc);
        gbc.gridx = 3;
        JTextField authorField = new JTextField(15);
        stockPanel.add(authorField, gbc);

        gbc.gridx = 0; gbc.gridy = 2;
        stockPanel.add(new JLabel("Price ($):"), gbc);
        gbc.gridx = 1;
        JTextField priceField = new JTextField(5);
        stockPanel.add(priceField, gbc);
        gbc.gridx = 2;
        stockPanel.add(new JLabel("Discount (%):"), gbc);
        gbc.gridx = 3;
        JTextField discountField = new JTextField(5);
        stockPanel.add(discountField, gbc);

        gbc.gridx = 0; gbc.gridy = 3;
        stockPanel.add(new JLabel("Quantity to Add:"), gbc);
        gbc.gridx = 1;
        JTextField qtyField = new JTextField(5);
        stockPanel.add(qtyField, gbc);
        gbc.gridx = 2; gbc.gridwidth = 2;
        JButton addBookButton = new JButton("Add/Update Book");
        stockPanel.add(addBookButton, gbc);
        topPanel.add(stockPanel);

        JPanel reportsPanel = new JPanel(new FlowLayout(FlowLayout.CENTER, 20, 5));
        reportsPanel.setBorder(BorderFactory.createTitledBorder("General Reports"));
        JButton viewRequestsButton = new JButton("View Book Requests");
        JButton viewLowStockButton = new JButton("View Low Stock Items");
        JButton clearRequestButton = new JButton("Clear Selected Request");
        reportsPanel.add(viewRequestsButton);
        reportsPanel.add(viewLowStockButton);
        reportsPanel.add(clearRequestButton);
        topPanel.add(reportsPanel);

        JPanel salesReportPanel = new JPanel(new FlowLayout(FlowLayout.CENTER));
        salesReportPanel.setBorder(BorderFactory.createTitledBorder("Sales Report"));
        salesReportPanel.add(new JLabel("Start:"));
        JSpinner startDateSpinner = new JSpinner(new SpinnerDateModel());
        startDateSpinner.setEditor(new JSpinner.DateEditor(startDateSpinner, "yyyy-MM-dd"));
        salesReportPanel.add(startDateSpinner);
        salesReportPanel.add(new JLabel("End:"));
        JSpinner endDateSpinner = new JSpinner(new SpinnerDateModel());
        endDateSpinner.setEditor(new JSpinner.DateEditor(endDateSpinner, "yyyy-MM-dd"));
        salesReportPanel.add(endDateSpinner);
        JButton generateSalesReportButton = new JButton("Generate");
        salesReportPanel.add(generateSalesReportButton);
        topPanel.add(salesReportPanel);

        JPanel inventoryPanel = new JPanel(new FlowLayout(FlowLayout.CENTER));
        inventoryPanel.setBorder(BorderFactory.createTitledBorder("Calculate Required Inventory"));
        JTextField isbnFieldInv = new JTextField(15);
        inventoryPanel.add(new JLabel("Book ISBN:"));
        inventoryPanel.add(isbnFieldInv);
        JButton calculateInvButton = new JButton("Calculate");
        inventoryPanel.add(calculateInvButton);
        topPanel.add(inventoryPanel);

        panel.add(topPanel, BorderLayout.NORTH);
        panel.add(new JScrollPane(reportTable), BorderLayout.CENTER);

        addBookButton.addActionListener(e -> {
            String isbn = isbnField.getText();
            if (isbn.trim().isEmpty()) {
                JOptionPane.showMessageDialog(this, "ISBN is a required field.", "Input Error", JOptionPane.ERROR_MESSAGE);
                return;
            }
            try {
                Book existingBook = bookDAO.findBookByIsbn(isbn);

                Book bookToSave = new Book();
                bookToSave.setIsbn(isbn);
                bookToSave.setTitle(titleField.getText().trim());
                bookToSave.setAuthor(authorField.getText().trim());

                double price = priceField.getText().trim().isEmpty() ? (existingBook != null ? existingBook.getPrice() : 0.0) : Double.parseDouble(priceField.getText());
                double discount = discountField.getText().trim().isEmpty() ? (existingBook != null ? existingBook.getDiscountPercentage() : 0.0) : Double.parseDouble(discountField.getText());
                int quantity = qtyField.getText().trim().isEmpty() ? 0 : Integer.parseInt(qtyField.getText());

                bookToSave.setPrice(price);
                bookToSave.setDiscountPercentage(discount);
                bookToSave.setQuantityInStock(quantity);

                boolean success;
                if (existingBook != null) {
                    success = bookDAO.updateBookDetails(bookToSave);
                } else {
                    bookToSave.setRackNumber("N/A");
                    bookToSave.setThresholdValue(10);
                    bookToSave.setPublisherId(1);
                    success = bookDAO.addNewBook(bookToSave);
                }

                if (success) {
                    JOptionPane.showMessageDialog(this, "Book details saved successfully for ISBN: " + isbn);
                    isbnField.setText("");
                    titleField.setText("");
                    authorField.setText("");
                    priceField.setText("");
                    discountField.setText("");
                    qtyField.setText("");
                } else {
                    JOptionPane.showMessageDialog(this, "Failed to save book details.", "Database Error", JOptionPane.ERROR_MESSAGE);
                }
            } catch (NumberFormatException ex) {
                JOptionPane.showMessageDialog(this, "Price, Discount, and Quantity must be valid numbers.", "Input Error", JOptionPane.ERROR_MESSAGE);
            }
        });

        viewRequestsButton.addActionListener(e -> {
            List<BookRequest> requests = bookRequestDAO.findAllRequests();
            DefaultTableModel model = new DefaultTableModel();
            model.setColumnIdentifiers(new String[]{"ID", "Title", "Author", "ISBN", "Status", "Date"});
            for (BookRequest req : requests) {
                model.addRow(new Object[]{req.getRequestId(), req.getBookTitle(), req.getBookAuthor(), req.getIsbn(), req.getStatus(), req.getRequestDate()});
            }
            reportTable.setModel(model);
        });

        viewLowStockButton.addActionListener(e -> {
            List<Book> books = reportDAO.findBooksBelowThreshold();
            DefaultTableModel model = new DefaultTableModel();
            model.setColumnIdentifiers(new String[]{"ISBN", "Title", "Stock", "Threshold"});
            for (Book book : books) {
                model.addRow(new Object[]{book.getIsbn(), book.getTitle(), book.getQuantityInStock(), book.getThresholdValue()});
            }
            reportTable.setModel(model);
        });

        clearRequestButton.addActionListener(e -> {
            int selectedRow = reportTable.getSelectedRow();
            if (selectedRow == -1) {
                JOptionPane.showMessageDialog(this, "Please select a request from the table to clear.", "No Selection", JOptionPane.WARNING_MESSAGE);
                return;
            }
            int requestId = (int) reportTable.getValueAt(selectedRow, 0);
            int confirm = JOptionPane.showConfirmDialog(this, "Are you sure you want to clear request ID " + requestId + "?", "Confirm Deletion", JOptionPane.YES_NO_OPTION);
            if (confirm == JOptionPane.YES_OPTION) {
                if (bookRequestDAO.deleteRequest(requestId)) {
                    JOptionPane.showMessageDialog(this, "Request cleared successfully.");
                    viewRequestsButton.doClick();
                } else {
                    JOptionPane.showMessageDialog(this, "Failed to clear the request.", "Database Error", JOptionPane.ERROR_MESSAGE);
                }
            }
        });

        generateSalesReportButton.addActionListener(e -> {
            Date startDateUtil = (Date) startDateSpinner.getValue();
            Date endDateUtil = (Date) endDateSpinner.getValue();
            java.sql.Date startDateSql = new java.sql.Date(startDateUtil.getTime());
            java.sql.Date endDateSql = new java.sql.Date(endDateUtil.getTime());
            List<Map<String, Object>> reportData = reportDAO.getSalesReport(startDateSql, endDateSql);
            DefaultTableModel model = new DefaultTableModel();
            model.setColumnIdentifiers(new String[]{"ISBN", "Title", "Publisher", "Copies Sold", "Total Revenue"});
            for (Map<String, Object> row : reportData) {
                model.addRow(new Object[]{row.get("bookIsbn"), row.get("title"), row.get("publisherName"), row.get("copiesSold"), String.format("$%.2f", row.get("salesRevenue"))});
            }
            reportTable.setModel(model);
        });

        calculateInvButton.addActionListener(e -> {
            String isbn = isbnFieldInv.getText();
            if (isbn == null || isbn.trim().isEmpty()) return;
            int requiredLevel = reportDAO.calculateRequiredInventory(isbn);
            JOptionPane.showMessageDialog(this, "Required inventory level for ISBN " + isbn + " is: " + requiredLevel, "Inventory Calculation", JOptionPane.INFORMATION_MESSAGE);
        });
        return panel;
    }
    
    private JPanel createManagementPanel() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        JTable managementTable = new JTable();
        
        JPanel viewSelectionPanel = new JPanel(new FlowLayout(FlowLayout.CENTER));
        viewSelectionPanel.setBorder(BorderFactory.createTitledBorder("Select View"));
        JButton viewCustomersBtn = new JButton("View Customers");
        JButton viewPublishersBtn = new JButton("View Publishers");
        viewSelectionPanel.add(viewCustomersBtn);
        viewSelectionPanel.add(viewPublishersBtn);

        JPanel actionPanel = new JPanel(new FlowLayout(FlowLayout.CENTER));
        actionPanel.setBorder(BorderFactory.createTitledBorder("Actions"));
        JButton addButton = new JButton("Add New...");
        JButton deleteButton = new JButton("Delete Selected");
        JButton viewBooksByPublisherBtn = new JButton("View Publisher's Books");
        actionPanel.add(addButton);
        actionPanel.add(deleteButton);
        actionPanel.add(viewBooksByPublisherBtn);

        JPanel topPanel = new JPanel();
        topPanel.setLayout(new BoxLayout(topPanel, BoxLayout.Y_AXIS));
        topPanel.add(viewSelectionPanel);
        topPanel.add(actionPanel);
        
        panel.add(topPanel, BorderLayout.NORTH);
        panel.add(new JScrollPane(managementTable), BorderLayout.CENTER);

        final String[] currentView = {""};

        viewCustomersBtn.addActionListener(e -> {
            currentView[0] = "Customers";
            List<Customer> customers = customerDAO.findAllCustomers();
            DefaultTableModel model = new DefaultTableModel();
            model.setColumnIdentifiers(new String[]{"ID", "Name", "Phone Number"});
            for (Customer c : customers) {
                model.addRow(new Object[]{c.getCustomerId(), c.getName(), c.getPhoneNumber()});
            }
            managementTable.setModel(model);
        });

        viewPublishersBtn.addActionListener(e -> {
            currentView[0] = "Publishers";
            List<Publisher> publishers = publisherDAO.findAllPublishers();
            DefaultTableModel model = new DefaultTableModel();
            model.setColumnIdentifiers(new String[]{"ID", "Name", "Address", "Phone", "Procure Days"});
            for (Publisher p : publishers) {
                model.addRow(new Object[]{p.getPublisherId(), p.getName(), p.getAddress(), p.getPhoneNumber(), p.getAvgProcurementDays()});
            }
            managementTable.setModel(model);
        });

        viewBooksByPublisherBtn.addActionListener(e -> {
            if (!currentView[0].equals("Publishers")) {
                JOptionPane.showMessageDialog(this, "Please select the 'View Publishers' list first.", "Invalid View", JOptionPane.WARNING_MESSAGE);
                return;
            }
            int selectedRow = managementTable.getSelectedRow();
            if (selectedRow == -1) {
                JOptionPane.showMessageDialog(this, "Please select a publisher from the table.", "No Selection", JOptionPane.WARNING_MESSAGE);
                return;
            }
            int publisherId = (int) managementTable.getValueAt(selectedRow, 0);
            String publisherName = (String) managementTable.getValueAt(selectedRow, 1);
            List<Book> books = bookDAO.findBooksByPublisherId(publisherId);

            JDialog bookDialog = new JDialog(this, "Books by " + publisherName, true);
            bookDialog.setSize(600, 400);
            bookDialog.setLocationRelativeTo(this);

            if (books.isEmpty()) {
                bookDialog.add(new JLabel("This publisher has no books in the system."));
            } else {
                DefaultTableModel bookModel = new DefaultTableModel();
                bookModel.setColumnIdentifiers(new String[]{"ISBN", "Title", "Author", "Price", "Stock"});
                for (Book book : books) {
                    bookModel.addRow(new Object[]{
                        book.getIsbn(),
                        book.getTitle(),
                        book.getAuthor(),
                        String.format("$%.2f", book.getPrice()),
                        book.getQuantityInStock()
                    });
                }
                JTable bookTable = new JTable(bookModel);
                bookDialog.add(new JScrollPane(bookTable));
            }
            bookDialog.setVisible(true);
        });

        addButton.addActionListener(e -> {
            switch (currentView[0]) {
                case "Customers":
                    AddCustomerDialog customerDialog = new AddCustomerDialog(this);
                    customerDialog.setVisible(true);
                    Customer newCustomer = customerDialog.getCustomer();
                    if (newCustomer != null && customerDAO.addCustomer(newCustomer)) {
                        JOptionPane.showMessageDialog(this, "Customer added.");
                        viewCustomersBtn.doClick();
                    }
                    break;
                case "Publishers":
                    AddPublisherDialog publisherDialog = new AddPublisherDialog(this);
                    publisherDialog.setVisible(true);
                    Publisher newPublisher = publisherDialog.getPublisher();
                    if (newPublisher != null && publisherDAO.addPublisher(newPublisher)) {
                        JOptionPane.showMessageDialog(this, "Publisher added.");
                        viewPublishersBtn.doClick();
                    }
                    break;
                default:
                    JOptionPane.showMessageDialog(this, "Please select a view first (e.g., View Customers).", "No View Selected", JOptionPane.INFORMATION_MESSAGE);
            }
        });
        
        deleteButton.addActionListener(e -> {
            int selectedRow = managementTable.getSelectedRow();
            if (selectedRow == -1) {
                JOptionPane.showMessageDialog(this, "Please select an item to delete.", "Warning", JOptionPane.WARNING_MESSAGE);
                return;
            }
            int id = (int) managementTable.getValueAt(selectedRow, 0);
            int confirm = JOptionPane.showConfirmDialog(this, "Are you sure you want to delete ID " + id + "?", "Confirm Deletion", JOptionPane.YES_NO_OPTION);
            if (confirm != JOptionPane.YES_OPTION) return;

            boolean success = false;
            switch (currentView[0]) {
                case "Customers":
                    success = customerDAO.deleteCustomer(id);
                    if (success) viewCustomersBtn.doClick();
                    break;
                case "Publishers":
                    success = publisherDAO.deletePublisher(id);
                    if (success) viewPublishersBtn.doClick();
                    break;
            }

            if (success) {
                JOptionPane.showMessageDialog(this, "Item deleted successfully.");
            } else {
                JOptionPane.showMessageDialog(this, "Failed to delete item. It may be in use by another record (e.g., a book or sale).", "Error", JOptionPane.ERROR_MESSAGE);
            }
        });

        return panel;
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new MainFrame().setVisible(true));
    }
}