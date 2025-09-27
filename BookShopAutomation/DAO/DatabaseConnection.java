package DAO;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DatabaseConnection {
    // --- IMPORTANT: UPDATE THESE FOR YOUR DATABASE ---
    private static final String URL = "jdbc:postgresql://localhost:5433/BookShopAutomation";
    private static final String USER = "postgres";
    private static final String PASSWORD = "ranjit12";

    public static Connection getConnection() {
        Connection connection = null;
        try {
            Class.forName("org.postgresql.Driver");
            connection = DriverManager.getConnection(URL, USER, PASSWORD);
        } catch (SQLException | ClassNotFoundException e) {
            e.printStackTrace();
        }
        return connection;
    }
}