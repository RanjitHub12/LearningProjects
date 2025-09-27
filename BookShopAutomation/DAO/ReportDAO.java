package DAO;

import MODEL.Book;
import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ReportDAO {

    public List<Book> findBooksBelowThreshold() {
        List<Book> books = new ArrayList<>();
        String sql = "SELECT b.*, p.name as publisherName FROM Book b " +
                     "JOIN Publisher p ON b.publisherId = p.publisherId " +
                     "WHERE b.quantityInStock < b.thresholdValue";
        try (Connection conn = DatabaseConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            while (rs.next()) {
                Book book = new Book();
                book.setIsbn(rs.getString("isbn"));
                book.setTitle(rs.getString("title"));
                book.setQuantityInStock(rs.getInt("quantityInStock"));
                book.setThresholdValue(rs.getInt("thresholdValue"));
                books.add(book);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return books;
    }

    public List<Map<String, Object>> getSalesReport(java.sql.Date startDate, java.sql.Date endDate) {
        List<Map<String, Object>> reportData = new ArrayList<>();
        String sql = "SELECT b.title, p.name as publisherName, si.bookIsbn, " +
                     "SUM(si.quantity) as copiesSold, SUM(si.priceAtTimeOfSale * si.quantity) as salesRevenue " +
                     "FROM SaleItem si " +
                     "JOIN Sale s ON si.saleId = s.saleId " +
                     "JOIN Book b ON si.bookIsbn = b.isbn " +
                     "JOIN Publisher p ON b.publisherId = p.publisherId " +
                     "WHERE s.saleDate BETWEEN ? AND ? " +
                     "GROUP BY b.title, p.name, si.bookIsbn " +
                     "ORDER BY salesRevenue DESC;";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setDate(1, startDate);
            pstmt.setDate(2, endDate);
            ResultSet rs = pstmt.executeQuery();
            while (rs.next()) {
                Map<String, Object> row = new HashMap<>();
                row.put("title", rs.getString("title"));
                row.put("publisherName", rs.getString("publisherName"));
                row.put("bookIsbn", rs.getString("bookIsbn"));
                row.put("copiesSold", rs.getInt("copiesSold"));
                row.put("salesRevenue", rs.getDouble("salesRevenue"));
                reportData.add(row);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return reportData;
    }

    public int calculateRequiredInventory(String isbn) {
        String salesSql = "SELECT SUM(si.quantity) as copiesSold FROM SaleItem si " +
                          "JOIN Sale s ON si.saleId = s.saleId " +
                          "WHERE si.bookIsbn = ? AND s.saleDate >= NOW() - INTERVAL '14 days'";
        String procurementSql = "SELECT p.avgProcurementDays FROM Publisher p " +
                                "JOIN Book b ON p.publisherId = b.publisherId WHERE b.isbn = ?";
        int copiesSoldLastTwoWeeks = 0;
        int avgProcurementDays = 0;
        try (Connection conn = DatabaseConnection.getConnection()) {
            try (PreparedStatement pstmt = conn.prepareStatement(salesSql)) {
                pstmt.setString(1, isbn);
                ResultSet rs = pstmt.executeQuery();
                if (rs.next()) {
                    copiesSoldLastTwoWeeks = rs.getInt("copiesSold");
                }
            }
            try (PreparedStatement pstmt = conn.prepareStatement(procurementSql)) {
                pstmt.setString(1, isbn);
                ResultSet rs = pstmt.executeQuery();
                if (rs.next()) {
                    avgProcurementDays = rs.getInt("avgProcurementDays");
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return copiesSoldLastTwoWeeks * avgProcurementDays;
    }
}