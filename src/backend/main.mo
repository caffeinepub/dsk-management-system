import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Map "mo:core/Map";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import Migration "migration";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Float "mo:core/Float";
import Int "mo:core/Int";
import Order "mo:core/Order";
import List "mo:core/List";

(with migration = Migration.run)
actor {
  include MixinStorage();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Types
  type Status = { #pending; #in_process; #completed };

  module Status {
    public func toText(status : Status) : Text {
      switch (status) {
        case (#pending) { "pending" };
        case (#in_process) { "in_process" };
        case (#completed) { "completed" };
      };
    };
  };

  type CustomerInput = {
    name : Text;
    phone : Text;
    serviceCategory : Text;
    serviceType : Text;
    customServiceName : ?Text;
    applicationNo : ?Text;
    applicationDate : Int;
    currentStatus : Status;
    deliveryDate : ?Int;
    expiryDate : ?Int;
    totalCharged : Float;
    govtFees : Float;
    advancePaid : Float;
    notes : ?Text;
    documentBlobIds : [Storage.ExternalBlob];
  };

  public type CustomerRecord = {
    tokenId : Text;
    name : Text;
    phone : Text;
    serviceCategory : Text;
    serviceType : Text;
    customServiceName : ?Text;
    applicationNo : ?Text;
    applicationDate : Int;
    currentStatus : Status;
    deliveryDate : ?Int;
    expiryDate : ?Int;
    totalCharged : Float;
    govtFees : Float;
    netProfit : Float;
    advancePaid : Float;
    balanceDue : Float;
    notes : ?Text;
    documentBlobIds : [Storage.ExternalBlob];
    isDeleted : Bool;
    deletedAt : ?Int;
    createdAt : Int;
    updatedAt : Int;
  };

  module CustomerRecord {
    public func compare(customer1 : CustomerRecord, customer2 : CustomerRecord) : Order.Order {
      Text.compare(customer1.tokenId, customer2.tokenId);
    };
  };

  type ExpenseInput = {
    description : Text;
    category : Text;
    amount : Float;
    date : Int;
  };

  public type ExpenseRecord = {
    id : Text;
    description : Text;
    category : Text;
    amount : Float;
    date : Int;
    createdAt : Int;
  };

  module ExpenseRecord {
    public func compare(expense1 : ExpenseRecord, expense2 : ExpenseRecord) : Order.Order {
      Text.compare(expense1.id, expense2.id);
    };
  };

  type DocumentLibraryInput = {
    serviceName : Text;
    description : ?Text;
    blob : Storage.ExternalBlob;
  };

  public type DocumentLibraryItem = {
    id : Text;
    serviceName : Text;
    description : ?Text;
    blob : Storage.ExternalBlob;
    uploadedAt : Int;
  };

  module DocumentLibraryItem {
    public func compare(item1 : DocumentLibraryItem, item2 : DocumentLibraryItem) : Order.Order {
      Text.compare(item1.id, item2.id);
    };
  };

  public type CustomServiceEntry = {
    name : Text;
    category : Text;
    addedAt : Int;
  };

  module CustomServiceEntry {
    public func compare(c1 : CustomServiceEntry, c2 : CustomServiceEntry) : Order.Order {
      Text.compare(c1.name, c2.name);
    };
  };

  public type ProfitSummary = {
    today : Float;
    thisMonth : Float;
    totalNetProfit : Float;
  };

  public type ExpenseSummary = {
    today : Float;
    thisMonth : Float;
    total : Float;
  };

  public type CustomersQueryResult = {
    customers : [CustomerRecord];
    total : Nat;
    sum : Float;
  };

  // State
  var customers = Map.empty<Text, CustomerRecord>();
  var expenses = Map.empty<Text, ExpenseRecord>();
  var documentLibrary = Map.empty<Text, DocumentLibraryItem>();
  var customServices = Map.empty<Text, CustomServiceEntry>();
  var customerCount = 0;
  var expenseCount = 0;
  var docCount = 0;

  // Helper: any logged-in (non-anonymous) user is allowed
  func isAuthenticated(caller : Principal) : Bool {
    not caller.isAnonymous();
  };

  // Helper function to add leading zeros to a Nat
  func addLeadingZeros(number : Nat, totalDigits : Nat) : Text {
    let numberText = number.toText();
    let numZeros = if (numberText.size() >= totalDigits) { 0 } else {
      totalDigits - numberText.size();
    };
    let zeros = List.empty<Text>();
    for (_ in Nat.range(0, numZeros)) {
      zeros.add("0");
    };
    let zerosText = zeros.toArray().foldLeft("", Text.concat);
    zerosText # numberText;
  };

  func generateTokenId() : Text {
    customerCount += 1;
    let id = customerCount;
    let padded = addLeadingZeros(id, 3);
    "DSK-" # padded;
  };

  func currentTimestamp() : Int {
    Time.now();
  };

  func getStartOfDay(timestamp : Int) : Int {
    let nanosPerDay = 86_400_000_000_000;
    (timestamp / nanosPerDay) * nanosPerDay;
  };

  func getStartOfMonth(timestamp : Int) : Int {
    let nanosPerDay = 86_400_000_000_000;
    let nanosPerMonth = nanosPerDay * 30;
    (timestamp / nanosPerMonth) * nanosPerMonth;
  };

  // Always returns true for any authenticated caller
  public shared ({ caller }) func claimFirstAdmin() : async Bool {
    isAuthenticated(caller);
  };

  public shared ({ caller }) func createCustomer(input : CustomerInput) : async Text {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Please login first");
    };
    let tokenId = generateTokenId();
    let now = currentTimestamp();

    let customer : CustomerRecord = {
      tokenId;
      name = input.name;
      phone = input.phone;
      serviceCategory = input.serviceCategory;
      serviceType = input.serviceType;
      customServiceName = input.customServiceName;
      applicationNo = input.applicationNo;
      applicationDate = input.applicationDate;
      currentStatus = input.currentStatus;
      deliveryDate = input.deliveryDate;
      expiryDate = input.expiryDate;
      totalCharged = input.totalCharged;
      govtFees = input.govtFees;
      netProfit = input.totalCharged - input.govtFees;
      advancePaid = input.advancePaid;
      balanceDue = input.totalCharged - input.advancePaid;
      notes = input.notes;
      documentBlobIds = input.documentBlobIds;
      isDeleted = false;
      deletedAt = null;
      createdAt = now;
      updatedAt = now;
    };

    customers.add(tokenId, customer);
    tokenId;
  };

  public shared ({ caller }) func updateCustomer(tokenId : Text, input : CustomerInput) : async Bool {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Please login first");
    };
    switch (customers.get(tokenId)) {
      case (null) { Runtime.trap("Customer not found") };
      case (?customer) {
        let updatedCustomer : CustomerRecord = {
          tokenId = customer.tokenId;
          name = input.name;
          phone = input.phone;
          serviceCategory = input.serviceCategory;
          serviceType = input.serviceType;
          customServiceName = input.customServiceName;
          applicationNo = input.applicationNo;
          applicationDate = input.applicationDate;
          currentStatus = input.currentStatus;
          deliveryDate = input.deliveryDate;
          expiryDate = input.expiryDate;
          totalCharged = input.totalCharged;
          govtFees = input.govtFees;
          netProfit = input.totalCharged - input.govtFees;
          advancePaid = input.advancePaid;
          balanceDue = input.totalCharged - input.advancePaid;
          notes = input.notes;
          documentBlobIds = input.documentBlobIds;
          isDeleted = false;
          deletedAt = null;
          createdAt = customer.createdAt;
          updatedAt = currentTimestamp();
        };
        customers.add(tokenId, updatedCustomer);
        true;
      };
    };
  };

  public query ({ caller }) func getCustomer(tokenId : Text) : async CustomerRecord {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Please login first");
    };
    switch (customers.get(tokenId)) {
      case (null) { Runtime.trap("Customer not found") };
      case (?customer) { customer };
    };
  };

  public query ({ caller }) func listCustomers() : async [CustomerRecord] {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Please login first");
    };
    customers.values().toArray().sort();
  };

  public query ({ caller }) func listDeletedCustomers() : async [CustomerRecord] {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Please login first");
    };
    customers.values().toArray().filter(func(c) { c.isDeleted }).sort();
  };

  public shared ({ caller }) func softDeleteCustomer(tokenId : Text) : async Bool {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Please login first");
    };
    switch (customers.get(tokenId)) {
      case (null) { Runtime.trap("Customer not found") };
      case (?customer) {
        let updatedCustomer = { customer with isDeleted = true; deletedAt = ?currentTimestamp() };
        customers.add(tokenId, updatedCustomer);
        true;
      };
    };
  };

  public shared ({ caller }) func restoreCustomer(tokenId : Text) : async Bool {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Please login first");
    };
    switch (customers.get(tokenId)) {
      case (null) { Runtime.trap("Customer not found") };
      case (?customer) {
        let updatedCustomer = { customer with isDeleted = false; deletedAt = null };
        customers.add(tokenId, updatedCustomer);
        true;
      };
    };
  };

  public query ({ caller }) func getProfitSummary() : async ProfitSummary {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Please login first");
    };
    let now = currentTimestamp();
    let startOfToday = getStartOfDay(now);
    let startOfMonth = getStartOfMonth(now);

    var todayProfit : Float = 0.0;
    var monthProfit : Float = 0.0;
    var totalProfit : Float = 0.0;

    for (customer in customers.values()) {
      if (not customer.isDeleted) {
        totalProfit += customer.netProfit;
        if (customer.createdAt >= startOfToday) {
          todayProfit += customer.netProfit;
        };
        if (customer.createdAt >= startOfMonth) {
          monthProfit += customer.netProfit;
        };
      };
    };

    {
      today = todayProfit;
      thisMonth = monthProfit;
      totalNetProfit = totalProfit;
    };
  };

  public query ({ caller }) func getUpcomingRenewals(daysAhead : Nat) : async [CustomerRecord] {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Please login first");
    };
    let now = currentTimestamp();
    let nanosPerDay = 86_400_000_000_000;
    let futureThreshold = now + (Int.fromNat(daysAhead) * nanosPerDay);

    let renewals = customers.values().toArray().filter(func(c : CustomerRecord) : Bool {
      if (c.isDeleted) {
        return false;
      };
      switch (c.expiryDate) {
        case (null) { false };
        case (?expiry) {
          expiry >= now and expiry <= futureThreshold;
        };
      };
    });

    renewals.sort(func(a : CustomerRecord, b : CustomerRecord) : Order.Order {
      switch (a.expiryDate, b.expiryDate) {
        case (?expA, ?expB) { Int.compare(expA, expB) };
        case (?_, null) { #less };
        case (null, ?_) { #greater };
        case (null, null) { #equal };
      };
    });
  };

  public shared ({ caller }) func addExpense(input : ExpenseInput) : async Text {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Please login first");
    };
    expenseCount += 1;
    let id = "EXP-" # addLeadingZeros(expenseCount, 3);
    let now = currentTimestamp();

    let expense : ExpenseRecord = {
      id;
      description = input.description;
      category = input.category;
      amount = input.amount;
      date = input.date;
      createdAt = now;
    };

    expenses.add(id, expense);
    id;
  };

  public query ({ caller }) func listExpenses() : async [ExpenseRecord] {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Please login first");
    };
    expenses.values().toArray().sort();
  };

  public query ({ caller }) func getExpenseSummary() : async ExpenseSummary {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Please login first");
    };
    let now = currentTimestamp();
    let startOfToday = getStartOfDay(now);
    let startOfMonth = getStartOfMonth(now);

    var todayExpense : Float = 0.0;
    var monthExpense : Float = 0.0;
    var totalExpense : Float = 0.0;

    for (expense in expenses.values()) {
      totalExpense += expense.amount;
      if (expense.date >= startOfToday) {
        todayExpense += expense.amount;
      };
      if (expense.date >= startOfMonth) {
        monthExpense += expense.amount;
      };
    };

    {
      today = todayExpense;
      thisMonth = monthExpense;
      total = totalExpense;
    };
  };

  public shared ({ caller }) func deleteExpense(id : Text) : async Bool {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Please login first");
    };
    if (expenses.containsKey(id)) {
      expenses.remove(id);
      true;
    } else {
      Runtime.trap("Expense not found");
    };
  };

  public shared ({ caller }) func addDocumentLibraryItem(input : DocumentLibraryInput) : async Text {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Please login first");
    };
    docCount += 1;
    let id = "DOC-" # addLeadingZeros(docCount, 3);
    let now = currentTimestamp();

    let docItem : DocumentLibraryItem = {
      id;
      serviceName = input.serviceName;
      description = input.description;
      blob = input.blob;
      uploadedAt = now;
    };

    documentLibrary.add(id, docItem);
    id;
  };

  public query ({ caller }) func listDocumentLibraryItems() : async [DocumentLibraryItem] {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Please login first");
    };
    documentLibrary.values().toArray().sort();
  };

  public shared ({ caller }) func deleteDocumentLibraryItem(id : Text) : async Bool {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Please login first");
    };
    if (documentLibrary.containsKey(id)) {
      documentLibrary.remove(id);
      true;
    } else {
      Runtime.trap("Document library item not found");
    };
  };

  public query ({ caller }) func listCustomServices() : async [CustomServiceEntry] {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Please login first");
    };
    customServices.values().toArray().sort();
  };

  public shared ({ caller }) func addCustomService(name : Text, category : Text) : async Bool {
    if (not isAuthenticated(caller)) {
      Runtime.trap("Please login first");
    };
    let now = currentTimestamp();

    let service : CustomServiceEntry = {
      name;
      category;
      addedAt = now;
    };

    customServices.add(name, service);
    true;
  };
};
