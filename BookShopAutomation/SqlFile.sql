/* * This script deletes all your tables.
 * You MUST run this in the correct order,
 * from most dependent to least dependent.
*/

DROP TABLE IF EXISTS SaleItem;
DROP TABLE IF EXISTS BookRequest;
DROP TABLE IF EXISTS Sale;
DROP TABLE IF EXISTS Book;
DROP TABLE IF EXISTS Publisher;
DROP TABLE IF EXISTS Customer;
DROP TABLE IF EXISTS Employee;


-- Create the Publisher table first as other tables depend on it
CREATE TABLE Publisher (
    publisherId SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phoneNumber VARCHAR(20),
    avgProcurementDays INT
);

-- Create the Book table (FIXED)
CREATE TABLE Book (
    isbn VARCHAR(13) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    price DECIMAL(10, 2) NOT NULL,
    quantityInStock INT NOT NULL,
    rackNumber VARCHAR(50),
    thresholdValue INT,
    publisherId INT,
    discountPercentage DECIMAL(5, 2) DEFAULT 0.0 NOT NULL, -- <-- THE FIX
    FOREIGN KEY (publisherId) REFERENCES Publisher(publisherId)
);

-- Create the Customer table
CREATE TABLE Customer (
    customerId SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phoneNumber VARCHAR(20)
);

-- Create the Employee table
CREATE TABLE Employee (
    employeeId SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL -- e.g., 'Manager' or 'Clerk'
);

-- Create the Sale table
CREATE TABLE Sale (
    saleId SERIAL PRIMARY KEY,
    saleDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    totalAmount DECIMAL(10, 2),
    customerId INT,
    employeeId INT,
    FOREIGN KEY (customerId) REFERENCES Customer(customerId),
    FOREIGN KEY (employeeId) REFERENCES Employee(employeeId)
);

-- Create the SaleItem table
CREATE TABLE SaleItem (
    saleItemId SERIAL PRIMARY KEY,
    saleId INT NOT NULL,
    bookIsbn VARCHAR(13) NOT NULL,
    quantity INT NOT NULL,
    priceAtTimeOfSale DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (saleId) REFERENCES Sale(saleId) ON DELETE CASCADE,
    FOREIGN KEY (bookIsbn) REFERENCES Book(isbn)
);

-- Create the BookRequest table
CREATE TABLE BookRequest (
    requestId SERIAL PRIMARY KEY,
    bookTitle VARCHAR(255) NOT NULL,
    bookAuthor VARCHAR(255),
    isbn VARCHAR(13),
    customerId INT,
    requestDate DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50), -- e.g., 'Pending', 'Available'
    FOREIGN KEY (customerId) REFERENCES Customer(customerId)
);

-- Insert Publishers
INSERT INTO Publisher (name, address, phoneNumber, avgProcurementDays) VALUES
('Scribner', '1230 Avenue of the Americas, New York, NY 10020', '212-698-7000', 12),
('Riverhead Books', '375 Hudson St, New York, NY 10014', '212-366-2000', 8),
('Bloomsbury Publishing', '50 Bedford Square, London, UK', '+44 20 7631 5600', 15),
('Vintage Books', '1745 Broadway, New York, NY 10019', '212-782-9000', 10);

-- Insert Books (FIXED)
INSERT INTO Book (isbn, title, author, price, quantityInStock, rackNumber, thresholdValue, publisherId, discountPercentage) VALUES
('9781476763262', 'The Great Gatsby', 'F. Scott Fitzgerald', 15.00, 40, 'C01', 10, 1, 0.0),
('9781594633669', 'The Girl on the Train', 'Paula Hawkins', 18.00, 60, 'F03', 15, 2, 0.0),
('9781408855652', 'Harry Potter and the Sorcerer''s Stone', 'J.K. Rowling', 24.99, 100, 'K01', 25, 3, 5.0),
('9780743273565', 'The Old Man and the Sea', 'Ernest Hemingway', 12.50, 25, 'C02', 10, 1, 0.0),
('9780545010221', 'The Hunger Games', 'Suzanne Collins', 14.95, 75, 'Y05', 20, 1, 0.0),
('9780307277671', 'The Wind-Up Bird Chronicle', 'Haruki Murakami', 16.95, 30, 'F05', 10, 4, 0.0);

-- Insert Employees
INSERT INTO Employee (name, role) VALUES
('Alice Manager', 'Manager'),
('Bob Clerk', 'Clerk');

-- Insert Customers
INSERT INTO Customer (name, phoneNumber) VALUES
('Charlie Brown', '555-0001'),
('Diana Prince', '555-0.002'),
('Eve Moneypenny', '555-0003');

-- Insert a Sale (Example 1: Single item)
INSERT INTO Sale (saleDate, totalAmount, customerId, employeeId) VALUES 
('2025-10-18 14:30:00', 24.99, 1, 1);
INSERT INTO SaleItem (saleId, bookIsbn, quantity, priceAtTimeOfSale) VALUES 
(1, '9781408855652', 1, 24.99); -- Price doesn't reflect discount, this is fine for testing

-- Insert a Sale (Example 2: Multiple items)
INSERT INTO Sale (saleDate, totalAmount, customerId, employeeId) VALUES 
('2025-10-19 11:20:00', 27.50, 2, 2);
INSERT INTO SaleItem (saleId, bookIsbn, quantity, priceAtTimeOfSale) VALUES 
(3, '9781476763262', 1, 15.00),
(3, '9780743273565', 1, 12.50);

-- Insert Book Requests
INSERT INTO BookRequest (bookTitle, bookAuthor, isbn, customerId, status) VALUES
('Dune', 'Frank Herbert', '9780441013593', 3, 'Pending'),
('A Gentleman in Moscow', 'Amor Towles', '9780670026197', 1, 'Pending');

-- Save all changes permanently!
COMMIT;