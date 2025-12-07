# 🌐 Offline Mode Setup Guide / آف لائن موڈ سیٹ اپ گائیڈ

## 📱 **Kya Karna Hai / What to Do**

### **Teacher (استاد) کے لیے:**

#### **Step 1: WiFi Hotspot On Karein**
1. اپنے phone/laptop ka **WiFi Hotspot** on karein
2. Hotspot name aur password note kar lein
3. Hotspot IP address dekh lein:
   - **Windows:** `ipconfig` command (WiFi Adapter ka IPv4)
   - **Mac/Linux:** `ifconfig` ya `ip addr`
   - Usually: `192.168.x.x` jesa hoga

#### **Step 2: Offline Server Start Karein**
```bash
# Backend folder main jayen
cd Backend

# Offline server chalaye
node offlineServer.js
```

Server message dikhayega:
```
🔌 Offline Server running on port 3030
📱 Students can connect to: http://<teacher-ip>:3030
📡 Make sure WiFi Hotspot is enabled
```

#### **Step 3: Teacher Dashboard Open Karein**
1. Browser mein `http://localhost:5173` open karein
2. Login karein (teacher account)
3. Top par **🟠 Offline Mode** dikhai dega
4. Class create karein normally - data offline save hoga

#### **Step 4: Students ko IP Address Bataye**
- Apna IP address (e.g., `192.168.137.1`) students ko bataye
- Students ko apne hotspot se connect karne ko kahein

#### **Step 5: Internet Aane Par Data Upload Karein**
1. Internet on karein
2. Top bar mein **"📤 Upload Data"** button click karein
3. Sari offline sessions automatically upload ho jayen gi

---

### **Student (طالب علم) کے لیے:**

#### **Step 1: Teacher ke Hotspot Se Connect Karein**
1. WiFi settings open karein
2. Teacher ka hotspot name dhoondh kar connect karein
3. Password enter karein

#### **Step 2: Teacher ka IP Configure Karein**
1. Browser mein student dashboard open karein (`http://localhost:5173`)
2. Login karein
3. Settings/Configuration mein teacher ka IP address enter karein
   - Example: `192.168.137.1`

#### **Step 3: QR Code Scan Karein**
1. Camera/QR Scanner open karein
2. Teacher ki screen par dikhaye QR code scan karein
3. Attendance automatically mark ho jaye gi (offline)

---

## 🔧 **Technical Setup**

### **1. Install Dependencies (Agar nahi kiya)**
```bash
# Backend
cd Backend
npm install

# Frontend
cd Frontend
npm install
```

### **2. Start All Servers**

#### **Terminal 1: Main Backend (Online Mode)**
```bash
cd Backend
npm start
# OR
node server.js
```

#### **Terminal 2: Offline Server (For P2P)**
```bash
cd Backend
node offlineServer.js
```

#### **Terminal 3: Frontend**
```bash
cd Frontend
npm run dev
```

---

## 📊 **How It Works / Kaise Kaam Karta Hai**

### **Online Mode (Internet Available):**
```
Teacher Device ←→ Internet ←→ MongoDB
     ↓                           ↑
Student Device ──────────────────┘
```

### **Offline Mode (No Internet):**
```
Teacher Device (Hotspot + Local Server)
     ↓
     ↓ WiFi Direct Connection
     ↓
Student Device
```

**Data Flow:**
1. Teacher creates class → Saved in local server memory
2. Student scans QR → Data sent to local server
3. Local server stores attendance
4. Internet returns → Teacher clicks "Upload"
5. All data syncs to MongoDB automatically

---

## 🎯 **Features / خصوصیات**

### ✅ **Offline Capabilities:**
- ✅ Teacher can create class sessions
- ✅ Students can scan QR codes
- ✅ Realtime attendance list updates
- ✅ All data stored locally
- ✅ Automatic sync when online
- ✅ Visual status indicators

### 🔒 **Safety Features:**
- ✅ Duplicate attendance prevention
- ✅ Data validation
- ✅ Failed sync retry mechanism
- ✅ Local data persistence

---

## 🐛 **Troubleshooting / مسائل حل**

### **Problem: Student connect nahi ho raha**
**Solution:**
- Teacher ka hotspot on hai?
- Student hotspot se connected hai?
- Teacher ka IP address sahi hai?
- Firewall local server ko block to nahi kar raha?

### **Problem: Data sync nahi ho raha**
**Solution:**
- Internet connection check karein
- Token expire to nahi hua?
- Re-login karke try karein
- Console errors check karein

### **Problem: Offline server start nahi ho rahi**
**Solution:**
```bash
# Port 3030 already in use?
netstat -ano | findstr :3030

# Process kill karein
taskkill /PID <pid> /F

# Phir se start karein
node offlineServer.js
```

---

## 📱 **Network Requirements**

### **Minimum:**
- Teacher: 1 device with WiFi hotspot capability
- Students: WiFi enabled devices
- No internet required for offline mode

### **Recommended:**
- Teacher: Laptop/PC with Ethernet + WiFi (simultaneous)
- Internet: Available for initial setup and sync

---

## 🔐 **Security Notes**

- Local server secured by same WiFi network
- Only connected students can access
- Authentication still required
- QR codes expire normally
- All standard security features work

---

## 📞 **Support**

Agar koi sawal hai to:
- Check console logs (F12 in browser)
- Check terminal output
- Verify all steps followed correctly

---

## 🚀 **Quick Start Commands**

```bash
# 1. Start Offline Server (Teacher)
cd Backend && node offlineServer.js

# 2. In another terminal - Start Main Server
cd Backend && npm start

# 3. In another terminal - Start Frontend
cd Frontend && npm run dev

# 4. Open Browser
# Teacher: http://localhost:5173 (login as teacher)
# Student: http://localhost:5173 (login as student)
```

---

**Bas! Ab aap offline mode use kar sakte hain! 🎉**
