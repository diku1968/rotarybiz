# Wallcity Rotary Biz Hub

Wallcity Rotary Biz Hub is a professional, premium CRM-style Business Networking and Lead Referral Portal designed for Rotary members. It runs as a lightning-fast Single Page Application (SPA) built with pure HTML5, CSS3, Bootstrap 5, and Vanilla JavaScript, backed by Google Firebase.

---

## 🌟 Key Features
1. **Interactive Analytics Dashboard**: Renders beautiful dynamic statistics (Member niches, monthly business trendlines, referral funnel stages) using Chart.js.
2. **Member Directory**: Full search filters by name, company, products, and services, plus a direct WhatsApp contact trigger.
3. **Corporate Profiles**: Individual profile pages where users can manage their corporate logo, description, and list of products/services.
4. **Requirement Board**: A live notice board for posting business demands, submitting bids (quotations), and reviewing vendor proposals.
5. **Quotation Management**: Side-by-side bid comparison tables for buyers to accept or decline vendor quotes.
6. **Referral Ledger**: Track incoming and outgoing warm lead referrals. Mark deals as "Converted" and log the Business Generated Value.
7. **Reports Center**: Export members lists and referral journals to Microsoft Excel spreadsheets (SheetJS) or download analytics summaries as formatted PDF reports (jsPDF).
8. **Sandbox Simulation Mode**: Runs instantly using browser local storage mock datasets if Firebase is not yet connected.

---

## 🚀 Getting Started & Configuration

The portal runs in **Pure Local Storage Mode** by default. Any data you edit is saved instantly in your local browser, and you can export/import backups. To share data dynamically with all members, you can set up a **Google Sheet** as your shared cloud database.

### Option A: Pure Local Mode (Zero Configuration)
1. Double click **index.html** or visit the hosted site.
2. Sign in instantly using the pre-filled account:
   - **Email**: `dhirenpathak1970@gmail.com`
   - **Password**: `password123`
3. You can back up your database or share it with other members by going to the **Settings Engine** and clicking **Export Database to JSON**. Other members can load it by uploading the `.json` backup file.

---

### Option B: Google Sheets Cloud Sync (Shared Multi-User Database)

This allows all members to read and write to the same shared Google Sheet in real-time, completely free!

#### Step 1: Create your Google Sheet
1. Open [Google Sheets](https://sheets.google.com) and create a **Blank Spreadsheet**.
2. Rename the spreadsheet (e.g., `Wallcity Rotary Biz Hub Database`).
3. Create four tabs by clicking the `+` sign at the bottom-left, naming them exactly:
   - `members`
   - `requirements`
   - `quotes`
   - `referrals`
4. Leave the sheets empty (the script will auto-create headers on first run).

#### Step 2: Add the Apps Script Web Service
1. In the top menu of your Google Sheet, go to **Extensions** > **Apps Script**.
2. Delete any code in the editor and paste the following script:

```javascript
// Google Apps Script to run as Web App
// Allows read/write operations for Wallcity Rotary Biz Hub

function doGet(e) {
  var action = e.parameter.action;
  if (action === "pullAll") {
    return ContentService.createTextOutput(JSON.stringify(pullAllData()))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  }
  return ContentService.createTextOutput(JSON.stringify({error: "Invalid action"}))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    var sheetName = postData.sheet;
    var rowData = postData.data;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    if (action.startsWith("sync")) {
      saveToSheet(sheet, rowData);
    }
    
    return ContentService.createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  }
}

function pullAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    members: getSheetRows(ss.getSheetByName("members")),
    requirements: getSheetRows(ss.getSheetByName("requirements")),
    quotes: getSheetRows(ss.getSheetByName("quotes")),
    referrals: getSheetRows(ss.getSheetByName("referrals"))
  };
}

function getSheetRows(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; 
  
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var rowObj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      if (typeof val === "string" && (val.startsWith("[") || val.startsWith("{"))) {
        try { val = JSON.parse(val); } catch(e){}
      }
      rowObj[headers[j]] = val;
    }
    rows.push(rowObj);
  }
  return rows;
}

function saveToSheet(sheet, dataObj) {
  var data = sheet.getDataRange().getValues();
  var headers = data.length > 0 ? data[0] : [];
  
  if (headers.length === 0) {
    headers = Object.keys(dataObj);
    sheet.appendRow(headers);
    data = [headers];
  } else {
    var keys = Object.keys(dataObj);
    keys.forEach(function(key) {
      if (headers.indexOf(key) === -1) {
        headers.push(key);
        sheet.getRange(1, headers.length).setValue(key);
      }
    });
  }
  
  var keyName = dataObj.uid ? "uid" : "id";
  var keyColIdx = headers.indexOf(keyName);
  var keyVal = dataObj[keyName];
  
  var rowIdx = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][keyColIdx] === keyVal) {
      rowIdx = i + 1;
      break;
    }
  }
  
  var rowValues = headers.map(function(header) {
    var val = dataObj[header];
    if (val && (typeof val === "object" || Array.isArray(val))) {
      return JSON.stringify(val);
    }
    return val !== undefined ? val : "";
  });
  
  if (rowIdx !== -1) {
    sheet.getRange(rowIdx, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}
```

3. Click the **Save icon** (floppy disk) at the top of Apps Script.

#### Step 3: Deploy the Web App
1. Click the blue **Deploy** button > select **New deployment**.
2. Click the gear icon next to "Select type" and select **Web app**.
3. Fill in the options:
   - **Description**: `Rotary Biz Sync`
   - **Execute as**: **Me (your-email@gmail.com)**
   - **Who has access**: **Anyone** (this is necessary so client browsers can sync their entries).
4. Click **Deploy**.
5. Copy the **Web App URL** generated (e.g., `https://script.google.com/macros/s/AKfycb.../exec`).

#### Step 4: Hook it into the Web App
1. Open the running Rotary Biz Hub app.
2. Go to the **Settings Engine** tab in the sidebar.
3. Paste the **Web App URL** you copied into the *Google Apps Script Web App URL* box.
4. Toggle the **Enable Google Sheets Sync** switch to **ON**.
5. Click **Save Sync Engine**. The page will reload and all your data is now cloud-synchronized!

---

## 💻 Running the Portal Locally
Simply open the `index.html` file in any browser or launch a simple local server if using push notification features. 

---

## 📦 Deployment to GitHub Pages

Since Wallcity Rotary Biz Hub is a static client-side web application, it can be hosted for **free** on GitHub Pages.

1. **Create a GitHub Repository**:
   - Go to [GitHub](https://github.com/) and create a new repository (e.g., `wallcity-rotary-biz-hub`).
2. **Commit and Push Files**:
   - Initialize git in your local project folder:
     ```bash
     git init
     git add .
     git commit -m "Initial commit - Wallcity Rotary Biz Hub"
     git branch -M main
     git remote add origin https://github.com/your-username/wallcity-rotary-biz-hub.git
     git push -u origin main
     ```
3. **Activate GitHub Pages**:
   - Open your repository on GitHub.
   - Go to **Settings** > **Pages** (under the "Code and automation" section).
   - Under **Build and deployment**, set the Source to **Deploy from a branch**.
   - Select the **main** branch and `/ (root)` folder, and click **Save**.
4. **Access the Portal**:
   - In a few minutes, GitHub will build the site and display the URL: `https://your-username.github.io/wallcity-rotary-biz-hub/`.

---

## 📁 Firestore Database Collections Schema

For reference, the collection document architectures are structured as:

### 1. `members`
- `uid` (String, Doc ID): Firebase User Auth UID
- `name` (String): Full Name
- `email` (String): Corporate Email
- `mobile` (String): WhatsApp Contact Number
- `companyName` (String): Register Company Name
- `category` (String): Professional niche
- `logoUrl` (String): URL of the uploaded image
- `description` (String): Corporate description
- `products` (Array of Strings): Products offered
- `services` (Array of Strings): Services provided
- `whatsapp` (String): Numeric whatsapp dialer ID
- `address` (String): Office Address
- `joinedAt` (Timestamp): Registration date

### 2. `requirements`
- `id` (String, Doc ID): Auto-generated
- `title` (String): Requirement overview
- `description` (String): Specifications detail
- `category` (String): Niche category
- `quantity` (Number): Count required
- `budget` (Number): Max budget in INR
- `creatorId` (String): Poster UID
- `creatorName` (String): Poster name
- `creatorCompany` (String): Poster company
- `createdAt` (Timestamp): Timestamp
- `deadline` (String): Deadline Date YYYY-MM-DD
- `status` (String): `'open'` or `'closed'`

### 3. `quotes`
- `id` (String, Doc ID): Auto-generated
- `requirementId` (String): Target requirement ID
- `vendorId` (String): Bidder UID
- `vendorName` (String): Bidder name
- `vendorCompanyName` (String): Bidder company
- `price` (Number): Bidding price
- `deliveryDays` (Number): Estimated delivery
- `notes` (String): Quotation details
- `status` (String): `'pending'`, `'accepted'`, or `'rejected'`
- `createdAt` (Timestamp): Timestamp

### 4. `referrals`
- `id` (String, Doc ID): Auto-generated
- `fromId` (String): Referrer UID
- `fromName` (String): Referrer name
- `fromCompany` (String): Referrer company
- `toId` (String): Referee UID
- `toName` (String): Referee name
- `toCompany` (String): Referee company
- `clientName` (String): Target client lead name
- `clientContact` (String): Client phone number
- `description` (String): Context of business deal
- `status` (String): `'pending'`, `'connected'`, `'in-progress'`, `'converted'`, or `'closed-lost'`
- `businessValue` (Number): Final conversion deal value in INR
- `createdAt` (Timestamp): Logging timestamp
- `updatedAt` (Timestamp): Update timestamp
