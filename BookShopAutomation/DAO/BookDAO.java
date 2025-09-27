package DAO;

import MODEL.Book;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class BookDAO {

    public Book findBookByIsbn(String isbn) {
        String sql = "SELECT * FROM Book WHERE isbn = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, isbn);
            ResultSet rs = pstmt.executeQuery();
            if (rs.next()) {
                return mapResultSetToBook(rs);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public Book findBookByTitle(String title) {
        String sql = "SELECT * FROM Book WHERE title ILIKE ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, "%" + title + "%");
            ResultSet rs = pstmt.executeQuery();
            if (rs.next()) {
                return mapResultSetToBook(rs);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public Book findBookByAuthor(String author) {
        String sql = "SELECT * FROM Book WHERE author ILIKE ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, "%" + author + "%");
            ResultSet rs = pstmt.executeQuery();
            if (rs.next()) {
                return mapResultSetToBook(rs);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public boolean addNewBook(Book book) {
        String sql = "INSERT INTO Book (isbn, title, author, price, quantityInStock, rackNumber, thresholdValue, publisherId, discountPercentage) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConnection.getConnection();
            PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, book.getIsbn());
            pstmt.setString(2, book.getTitle());
            pstmt.setString(3, book.getAuthor());
            pstmt.setDouble(4, book.getPrice());
            pstmt.setInt(5, book.getQuantityInStock());
            pstmt.setString(6, book.getRackNumber());
            pstmt.setInt(7, book.getThresholdValue());
            pstmt.setInt(8, book.getPublisherId());
            pstmt.setDouble(9, book.getDiscountPercentage());

            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean updateBookDetails(Book book) {
        // This query updates everything AND adds the new quantity to the existing stock.
        String sql = "UPDATE Book SET " +
                    "title = ?, " +
                    "author = ?, " +
                    "price = ?, " +
                    "discountPercentage = ?, " +
                    "quantityInStock = quantityInStock + ? " +
                    "WHERE isbn = ?";
        try (Connection conn = DatabaseConnection.getConnection();
            PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, book.getTitle());
            pstmt.setString(2, book.getAuthor());
            pstmt.setDouble(3, book.getPrice());
            pstmt.setDouble(4, book.getDiscountPercentage());
            pstmt.setInt(5, book.getQuantityInStock()); // The quantity to ADD
            pstmt.setString(6, book.getIsbn());

            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    // ALSO, UPDATE your mapResultSetToBook helper method to include the new field
    private Book mapResultSetToBook(ResultSet rs) throws SQLException {
        Book book = new Book();
        book.setIsbn(rs.getString("isbn"));
        book.setTitle(rs.getString("title"));
        book.setAuthor(rs.getString("author"));
        book.setPrice(rs.getDouble("price"));
        book.setQuantityInStock(rs.getInt("quantityInStock"));
        book.setRackNumber(rs.getString("rackNumber"));
        book.setThresholdValue(rs.getInt("thresholdValue"));
        book.setPublisherId(rs.getInt("publisherId"));
        book.setDiscountPercentage(rs.getDouble("discountPercentage")); // ADD THIS LINE
        return book;
    }

    public boolean updateStockByTitle(String title, int quantityToAdd) {
        String sql = "UPDATE Book SET quantityInStock = quantityInStock + ? WHERE title ILIKE ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setInt(1, quantityToAdd);
            pstmt.setString(2, title);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }
    public List<Book> findBooksByPublisherId(int publisherId) {
    List<Book> books = new ArrayList<>();
    String sql = "SELECT * FROM Book WHERE publisherId = ?";
    try (Connection conn = DatabaseConnection.getConnection();
         PreparedStatement pstmt = conn.prepareStatement(sql)) {

        pstmt.setInt(1, publisherId);
        ResultSet rs = pstmt.executeQuery();

        while (rs.next()) {
            books.add(mapResultSetToBook(rs));
        }
    } catch (SQLException e) {
        e.printStackTrace();
    }
    return books;
}
}