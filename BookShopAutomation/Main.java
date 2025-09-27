import javax.swing.SwingUtilities;
import UI.MainFrame;

/**
 * The main entry point for the Bookshop Automation System.
 */
public class Main {

    public static void main(String[] args) {
        // This ensures the UI is created on the Event Dispatch Thread,
        // which is the standard and safest way to launch a Swing application.
        SwingUtilities.invokeLater(new Runnable() {
            @Override
            public void run() {
                // Create an instance of the main window and make it visible.
                new MainFrame().setVisible(true);
            }
        });
    }
}