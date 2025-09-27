package DAO;

import MODEL.Publisher;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class PublisherDAO {

    public List<Publisher> findAllPublishers() {
        List<Publisher> publishers = new ArrayList<>();
        String sql = "SELECT * FROM Publisher ORDER BY name";
        try (Connection conn = DatabaseConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            while (rs.next()) {
                Publisher p = new Publisher();
                p.setPublisherId(rs.getInt("publisherId"));
                p.setName(rs.getString("name"));
                p.setAddress(rs.getString("address"));
                p.setPhoneNumber(rs.getString("phoneNumber"));
                p.setAvgProcurementDays(rs.getInt("avgProcurementDays"));
                publishers.add(p);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return publishers;
    }

    public boolean addPublisher(Publisher publisher) {
        String sql = "INSERT INTO Publisher (name, address, phoneNumber, avgProcurementDays) VALUES (?, ?, ?, ?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, publisher.getName());
            pstmt.setString(2, publisher.getAddress());
            pstmt.setString(3, publisher.getPhoneNumber());
            pstmt.setInt(4, publisher.getAvgProcurementDays());
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean deletePublisher(int publisherId) {
        // Note: This will fail if any book is still linked to this publisher due to foreign key constraints.
        String sql = "DELETE FROM Publisher WHERE publisherId = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setInt(1, publisherId);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }
}