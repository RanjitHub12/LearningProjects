package MODEL;

public class SaleItem {
    private int saleItemId;
    private int saleId;
    private String bookIsbn;
    private int quantity;
    private double priceAtTimeOfSale;

    public int getSaleItemId() { return saleItemId; }
    public void setSaleItemId(int saleItemId) { this.saleItemId = saleItemId; }
    public int getSaleId() { return saleId; }
    public void setSaleId(int saleId) { this.saleId = saleId; }
    public String getBookIsbn() { return bookIsbn; }
    public void setBookIsbn(String bookIsbn) { this.bookIsbn = bookIsbn; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public double getPriceAtTimeOfSale() { return priceAtTimeOfSale; }
    public void setPriceAtTimeOfSale(double priceAtTimeOfSale) { this.priceAtTimeOfSale = priceAtTimeOfSale; }
}