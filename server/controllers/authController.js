const User = require("../models/User")
const jwt = require("jsonwebtoken")

// Signup
exports.signup = async (req, res) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ message: "Email, password, and name are required" })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" })
    }

    const user = new User({ email, passwordHash: password, name })
    await user.save()

    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    })

    res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name } })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    })

    res.json({ token, user: { id: user._id, email: user.email, name: user.name } })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Get current user
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-passwordHash")
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}
