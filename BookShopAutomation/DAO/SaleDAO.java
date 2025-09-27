package DAO;

import MODEL.Sale;
import MODEL.SaleItem;
import java.sql.*;

public class SaleDAO {
    public boolean createSale(Sale sale) {
        String saleSQL = "INSERT INTO Sale (customerId, employeeId, totalAmount) VALUES (?, ?, ?) RETURNING saleId";
        String saleItemSQL = "INSERT INTO SaleItem (saleId, bookIsbn, quantity, priceAtTimeOfSale) VALUES (?, ?, ?, ?)";
        String updateStockSQL = "UPDATE Book SET quantityInStock = quantityInStock - ? WHERE isbn = ?";
        Connection conn = null;
        try {
            conn = DatabaseConnection.getConnection();
            conn.setAutoCommit(false);

            PreparedStatement salePstmt = conn.prepareStatement(saleSQL, Statement.RETURN_GENERATED_KEYS);
            salePstmt.setInt(1, sale.getCustomerId());
            salePstmt.setInt(2, sale.getEmployeeId());
            salePstmt.setDouble(3, sale.getTotalAmount());
            salePstmt.executeUpdate();

            ResultSet rs = salePstmt.getGeneratedKeys();
            int saleId = -1;
            if (rs.next()) {
                saleId = rs.getInt(1);
            } else {
                conn.rollback();
                return false;
            }

            PreparedStatement saleItemPstmt = conn.prepareStatement(saleItemSQL);
            PreparedStatement updateStockPstmt = conn.prepareStatement(updateStockSQL);
            for (SaleItem item : sale.getSaleItems()) {
                saleItemPstmt.setInt(1, saleId);
                saleItemPstmt.setString(2, item.getBookIsbn());
                saleItemPstmt.setInt(3, item.getQuantity());
                saleItemPstmt.setDouble(4, item.getPriceAtTimeOfSale());
                saleItemPstmt.addBatch();

                updateStockPstmt.setInt(1, item.getQuantity());
                updateStockPstmt.setString(2, item.getBookIsbn());
                updateStockPstmt.addBatch();
            }
            saleItemPstmt.executeBatch();
            updateStockPstmt.executeBatch();
            conn.commit();
            return true;
        } catch (SQLException e) {
            if (conn != null) try { conn.rollback(); } catch (SQLException ex) { ex.printStackTrace(); }
            e.printStackTrace();
            return false;
        } finally {
            if (conn != null) try { conn.setAutoCommit(true); } catch (SQLException ex) { ex.printStackTrace(); }
        }
    }
}