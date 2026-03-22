import Map "mo:core/Map";
import Text "mo:core/Text";
import Storage "blob-storage/Storage";

module {
  type Status = { #pending; #in_process; #completed };

  type OldCustomerRecord = {
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

  type OldExpenseRecord = {
    id : Text;
    description : Text;
    category : Text;
    amount : Float;
    date : Int;
    createdAt : Int;
  };

  type OldDocumentLibraryItem = {
    id : Text;
    serviceName : Text;
    description : ?Text;
    blob : Storage.ExternalBlob;
    uploadedAt : Int;
  };

  type OldCustomServiceEntry = {
    name : Text;
    category : Text;
    addedAt : Int;
  };

  type OldActor = {
    customers : Map.Map<Text, OldCustomerRecord>;
    expenses : Map.Map<Text, OldExpenseRecord>;
    documentLibrary : Map.Map<Text, OldDocumentLibraryItem>;
    customServices : Map.Map<Text, OldCustomServiceEntry>;
    customerCount : Nat;
    expenseCount : Nat;
    docCount : Nat;
  };

  type NewCustomerRecord = {
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

  type NewExpenseRecord = {
    id : Text;
    description : Text;
    category : Text;
    amount : Float;
    date : Int;
    createdAt : Int;
  };

  type NewDocumentLibraryItem = {
    id : Text;
    serviceName : Text;
    description : ?Text;
    blob : Storage.ExternalBlob;
    uploadedAt : Int;
  };

  type NewCustomServiceEntry = {
    name : Text;
    category : Text;
    addedAt : Int;
  };

  type NewActor = {
    customers : Map.Map<Text, NewCustomerRecord>;
    expenses : Map.Map<Text, NewExpenseRecord>;
    documentLibrary : Map.Map<Text, NewDocumentLibraryItem>;
    customServices : Map.Map<Text, NewCustomServiceEntry>;
    customerCount : Nat;
    expenseCount : Nat;
    docCount : Nat;
  };

  public func run(old : OldActor) : NewActor {
    let customers = old.customers.map<Text, OldCustomerRecord, NewCustomerRecord>(
      func(_tokenId, oldCustomer) {
        {
          tokenId = oldCustomer.tokenId;
          name = oldCustomer.name;
          phone = oldCustomer.phone;
          serviceCategory = oldCustomer.serviceCategory;
          serviceType = oldCustomer.serviceType;
          customServiceName = oldCustomer.customServiceName;
          applicationNo = oldCustomer.applicationNo;
          applicationDate = oldCustomer.applicationDate;
          currentStatus = oldCustomer.currentStatus;
          deliveryDate = oldCustomer.deliveryDate;
          expiryDate = oldCustomer.expiryDate;
          totalCharged = oldCustomer.totalCharged;
          govtFees = oldCustomer.govtFees;
          netProfit = oldCustomer.netProfit;
          advancePaid = oldCustomer.advancePaid;
          balanceDue = oldCustomer.balanceDue;
          notes = oldCustomer.notes;
          documentBlobIds = oldCustomer.documentBlobIds;
          isDeleted = oldCustomer.isDeleted;
          deletedAt = oldCustomer.deletedAt;
          createdAt = oldCustomer.createdAt;
          updatedAt = oldCustomer.updatedAt;
        };
      }
    );

    let expenses = old.expenses.map<Text, OldExpenseRecord, NewExpenseRecord>(
      func(_id, oldExpense) {
        {
          id = oldExpense.id;
          description = oldExpense.description;
          category = oldExpense.category;
          amount = oldExpense.amount;
          date = oldExpense.date;
          createdAt = oldExpense.createdAt;
        };
      }
    );

    let documentLibrary = old.documentLibrary.map<Text, OldDocumentLibraryItem, NewDocumentLibraryItem>(
      func(_id, oldDoc) {
        {
          id = oldDoc.id;
          serviceName = oldDoc.serviceName;
          description = oldDoc.description;
          blob = oldDoc.blob;
          uploadedAt = oldDoc.uploadedAt;
        };
      }
    );

    let customServices = old.customServices.map<Text, OldCustomServiceEntry, NewCustomServiceEntry>(
      func(name, oldCS) {
        {
          name;
          category = oldCS.category;
          addedAt = oldCS.addedAt;
        };
      }
    );

    {
      customers;
      expenses;
      documentLibrary;
      customServices;
      customerCount = old.customerCount;
      expenseCount = old.expenseCount;
      docCount = old.docCount;
    };
  };
};
