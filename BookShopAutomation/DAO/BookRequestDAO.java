package DAO;

import MODEL.BookRequest;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class BookRequestDAO {

    public boolean createRequest(BookRequest request) {
        String sql = "INSERT INTO BookRequest (bookTitle, bookAuthor, isbn, customerId, status) VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setString(1, request.getBookTitle());
            pstmt.setString(2, request.getBookAuthor());
            pstmt.setString(3, request.getIsbn());
            pstmt.setInt(4, request.getCustomerId());
            pstmt.setString(5, "Pending");
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean updateRequestStatusByIsbn(String isbn, String newStatus, Connection conn) {
        String sql = "UPDATE BookRequest SET status = ? WHERE isbn = ? AND status = 'Pending'";
        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, newStatus);
            pstmt.setString(2, isbn);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public List<BookRequest> findAllRequests() {
        List<BookRequest> requests = new ArrayList<>();
        String sql = "SELECT * FROM BookRequest ORDER BY requestDate DESC";
        try (Connection conn = DatabaseConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            while (rs.next()) {
                BookRequest request = new BookRequest();
                request.setRequestId(rs.getInt("requestId"));
                request.setBookTitle(rs.getString("bookTitle"));
                request.setBookAuthor(rs.getString("bookAuthor"));
                request.setIsbn(rs.getString("isbn"));
                request.setCustomerId(rs.getInt("customerId"));
                request.setRequestDate(rs.getDate("requestDate"));
                request.setStatus(rs.getString("status"));
                requests.add(request);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return requests;
    }

    public boolean deleteRequest(int requestId) {
        String sql = "DELETE FROM BookRequest WHERE requestId = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setInt(1, requestId);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }
}