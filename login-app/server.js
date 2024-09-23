const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
// app.use('/uploads', express.static('uploads'));


// MongoDB connection
mongoose.connect("mongodb://localhost:27017/loginDB")
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

// User Schema and Model
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

// Employee Schema and Model
const employeeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobileNumber: { type: String, required: true },
    designation: { type: String, required: true },
    gender: { type: String, required: true },
    courses: { type: [String], required: true },
    imagePath: { type: String, required: true },
});

const Employee = mongoose.model("Employee", employeeSchema);

// Register Route
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    try {
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Error registering user" });
    }
});

// Login Route
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        res.status(200).json({ message: "Login successful" });
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ message: "Error logging in" });
    }
});

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = "uploads/";
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir); // Create directory if it doesn't exist
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });

// Create Employee Route
app.post("/create-employee", upload.single("image"), async (req, res) => {
    const { name, email, mobileNumber, designation, gender, courses } = req.body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
    }

    // Check for duplicate email
    const emailExists = await Employee.findOne({ email });
    if (emailExists) {
        return res.status(400).json({ message: "Email already exists" });
    }

    const imagePath = req.file.path;

    try {
        const newEmployee = new Employee({
            name,
            email,
            mobileNumber,
            designation,
            gender,
            courses: courses.split(','), // Assuming courses are sent as a comma-separated string
            imagePath,
        });
        await newEmployee.save();
        res.status(201).json({ message: "Employee created successfully" });
    } catch (error) {
        console.error("Error creating employee:", error);
        res.status(500).json({ message: "Error creating employee" });
    }
});

// Fetch all employees
app.get("/employees", async (req, res) => {
    try {
        const employees = await Employee.find();
        res.status(200).json(employees);
    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ message: "Error fetching employees" });
    }
});


// Delete an employee by ID
app.delete("/employees/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const employee = await Employee.findById(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // Remove the associated image file
        if (employee.imagePath) {
            fs.unlinkSync(employee.imagePath); // Delete the file from the server
        }

        await Employee.findByIdAndDelete(id);
        res.status(200).json({ message: "Employee deleted successfully" });
    } catch (error) {
        console.error("Error deleting employee:", error);
        res.status(500).json({ message: "Error deleting employee" });
    }
});

// Fetch a single employee by ID
app.get("/employees/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const employee = await Employee.findById(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }
        res.status(200).json(employee);
    } catch (error) {
        console.error("Error fetching employee:", error);
        res.status(500).json({ message: "Error fetching employee" });
    }
});


// Update Employee Route
app.put("/employees/:id", upload.single("image"), async (req, res) => {
    const { id } = req.params;
    const { name, email, mobileNumber, designation, gender, courses } = req.body;
    const updateData = {
        name,
        email,
        mobileNumber,
        designation,
        gender,
        courses: courses.split(','),
    };

    if (req.file) {
        updateData.imagePath = req.file.path; // Update the image path only if a new file is uploaded
    }

    try {
        const updatedEmployee = await Employee.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json(updatedEmployee);
    } catch (error) {
        console.error("Error updating employee:", error);
        res.status(500).json({ message: "Error updating employee" });
    }
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
