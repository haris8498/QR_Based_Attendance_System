# 📋 Teacher Quick Reference Card - Offline Mode
# استاد کے لیے فوری ریفرنس کارڈ

---

## 🚀 OFFLINE MODE - 3 STEPS

### **Step 1: WiFi Hotspot On Karein**
```
1. Phone/Laptop settings open karein
2. WiFi Hotspot enable karein
3. Name: QR_Attendance (or any name)
4. Password: Set strong password
```

**IP Address Check Karein:**
- **Windows:** Command Prompt → `ipconfig`
- **Mac:** Terminal → `ifconfig en0 | grep inet`
- **Linux:** Terminal → `ip addr show`

📝 **Note your IP:** `192.168.___.___ `

---

### **Step 2: Offline Server Start Karein**
```bash
# Open Command Prompt/Terminal
cd Backend
node offlineServer.js
```

**✅ Success Message:**
```
🔌 Offline Server running on port 3030
📱 Students can connect to: http://192.168.x.x:3030
```

---

### **Step 3: Login & Create Class**
```
1. Browser → http://localhost:5173
2. Login karein
3. Top bar → 🟠 Offline Mode dikhai dega
4. Course select karein
5. "Generate QR" click karein
6. Students ko scan karne de
```

---

## 👨‍🎓 STUDENTS KO YE BATAYE:

### **Connection Instructions:**
```
1. WiFi Settings open karo
2. "QR_Attendance" hotspot ko select karo
3. Password enter karo: _____________
4. Browser mein Student Dashboard open karo
5. Settings → Teacher IP enter karo: 192.168.___.___ 
6. QR Code scan karo
```

---

## 📤 INTERNET WAPAS AANE PAR:

### **Data Upload Steps:**
```
1. Internet ON karein
2. Top bar → 🟢 Online dikhai dega
3. "📤 Upload Data" button click karein
4. Wait for confirmation
5. ✅ All data uploaded to server!
```

---

## ⚠️ COMMON ISSUES - QUICK FIX

### **Problem 1: Students connect nahi ho rahe**
**Fix:**
- [ ] Hotspot ON hai?
- [ ] Password sahi hai?
- [ ] `node offlineServer.js` chal raha hai?
- [ ] Firewall block to nahi kar raha?

**Test:** Browser mein type karein:
```
http://192.168.x.x:3030/api/offline/status
```
Agar `{"status":"online"}` dikhe, to server working hai.

---

### **Problem 2: Offline Server start nahi ho rahi**
**Fix:**
```bash
# Port 3030 check karein
netstat -ano | findstr :3030

# Agar koi process chal raha hai, kill karein:
taskkill /PID <number> /F

# Phir se start karein
node offlineServer.js
```

---

### **Problem 3: Data sync nahi ho raha**
**Fix:**
- [ ] Internet check karein
- [ ] Browser refresh karein (F5)
- [ ] Re-login karein
- [ ] "Upload Data" dubara click karein

---

## 📊 STATUS INDICATORS

| Indicator | Meaning | Action Required |
|-----------|---------|-----------------|
| 🟢 Online | Internet available | Normal operation |
| 🟠 Offline-Local | Hotspot mode active | Students can join |
| 🔴 Offline | No connection | Configure IP |

---

## 💡 PRO TIPS

### **Before Class:**
- ✅ Fully charge your device
- ✅ Test hotspot range in classroom
- ✅ Save your IP address
- ✅ Keep backup power bank

### **During Class:**
- ✅ Keep screen on (don't sleep)
- ✅ Monitor attendance list
- ✅ Check real-time updates
- ✅ Note any issues

### **After Class:**
- ✅ Keep data until synced
- ✅ Don't close browser before sync
- ✅ Upload data as soon as internet available
- ✅ Verify data in online reports

---

## 📱 SHARE THIS WITH STUDENTS:

```
================================
QR ATTENDANCE - OFFLINE MODE
================================

1. Connect to: QR_Attendance
2. Password: _____________
3. Configure IP: 192.168.___.___ 
4. Scan teacher's QR
5. Done! ✅

Need help? Ask teacher
================================
```

---

## 🆘 EMERGENCY CONTACTS

**Technical Support:**
- Check: OFFLINE_GUIDE.md
- Console: Press F12 in browser
- Logs: Check terminal output

**Manual Backup:**
- Browser → F12 → Console
- Type: `localStorage.getItem('pendingSessions')`
- Copy output and save

---

## ✅ PRE-CLASS CHECKLIST

Before starting offline mode:

- [ ] MongoDB running (if syncing later)
- [ ] Backend server running (`npm start`)
- [ ] Offline server running (`node offlineServer.js`)
- [ ] Frontend running (`npm run dev`)
- [ ] WiFi Hotspot ON
- [ ] IP address noted
- [ ] Device fully charged
- [ ] Tested with one student

---

## 📞 QUICK COMMANDS

### **Find Your IP:**
```bash
# Windows
ipconfig | findstr IPv4

# Mac
ifconfig | grep "inet "

# Linux  
hostname -I
```

### **Check Servers:**
```bash
# Main Server
curl http://localhost:5000

# Offline Server
curl http://localhost:3030/api/offline/status
```

### **Restart Everything:**
```bash
# Windows
start-offline-mode.bat

# Linux/Mac
./start-offline-mode.sh
```

---

## 🎓 REMEMBER

1. **Hotspot = Connection** → Without hotspot, no offline mode
2. **IP Address = Gateway** → Students need this to connect
3. **Sync = Save** → Don't forget to upload when online
4. **Test First** → Always test before actual class

---

**Print this card and keep near your desk! 📋**

**Questions? Check OFFLINE_GUIDE.md**

---

**Happy Teaching in Offline Mode! 🎉**
