import Map "mo:core/Map";
import Text "mo:core/Text";
import Storage "blob-storage/Storage";
import Principal "mo:core/Principal";

module {
  type Status = { #pending; #in_process; #completed };

  type CustomerRecord = {
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

  type ExpenseRecord = {
    id : Text;
    description : Text;
    category : Text;
    amount : Float;
    date : Int;
    createdAt : Int;
  };

  type DocumentLibraryItem = {
    id : Text;
    serviceName : Text;
    description : ?Text;
    blob : Storage.ExternalBlob;
    uploadedAt : Int;
  };

  type CustomServiceEntry = {
    name : Text;
    category : Text;
    addedAt : Int;
  };

  type RenewalRecord = {
    id : Text;
    customerId : Text;
    serviceName : Text;
    renewalDate : Int;
    nextExpiryDate : Int;
    govtFees : Float;
    serviceCharge : Float;
    totalCharged : Float;
    advancePaid : Float;
    balanceDue : Float;
    documentBlob : ?Storage.ExternalBlob;
    createdAt : Int;
  };

  type UserProfile = {
    name : Text;
  };

  type OldActor = {
    customers : Map.Map<Text, CustomerRecord>;
    expenses : Map.Map<Text, ExpenseRecord>;
    documentLibrary : Map.Map<Text, DocumentLibraryItem>;
    customServices : Map.Map<Text, CustomServiceEntry>;
    customerCount : Nat;
    expenseCount : Nat;
    docCount : Nat;
  };

  type NewActor = {
    customers : Map.Map<Text, CustomerRecord>;
    expenses : Map.Map<Text, ExpenseRecord>;
    documentLibrary : Map.Map<Text, DocumentLibraryItem>;
    customServices : Map.Map<Text, CustomServiceEntry>;
    renewalRecords : Map.Map<Text, RenewalRecord>;
    userProfiles : Map.Map<Principal, UserProfile>;
    customerCount : Nat;
    expenseCount : Nat;
    docCount : Nat;
    renewalCount : Nat;
  };

  public func run(old : OldActor) : NewActor {
    {
      customers = old.customers;
      expenses = old.expenses;
      documentLibrary = old.documentLibrary;
      customServices = old.customServices;
      renewalRecords = Map.empty<Text, RenewalRecord>();
      userProfiles = Map.empty<Principal, UserProfile>();
      customerCount = old.customerCount;
      expenseCount = old.expenseCount;
      docCount = old.docCount;
      renewalCount = 0;
    };
  };
};
