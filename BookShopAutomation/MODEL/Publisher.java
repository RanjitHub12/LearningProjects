package MODEL;

public class Publisher {
    private int publisherId;
    private String name;
    private String address;
    private String phoneNumber;
    private int avgProcurementDays;

    // Getters and Setters
    public int getPublisherId() { return publisherId; }
    public void setPublisherId(int publisherId) { this.publisherId = publisherId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public int getAvgProcurementDays() { return avgProcurementDays; }
    public void setAvgProcurementDays(int avgProcurementDays) { this.avgProcurementDays = avgProcurementDays; }
}