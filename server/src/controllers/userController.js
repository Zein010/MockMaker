import User from '../models/User.js';

 const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

   const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error during login" });
  }
};

export const register = async (req, res) => {
  try {
    const {name, email, password } = req.body;
    {
        // i just put this inside branckets for to have it's own scope (const user not effecting the const user outside)
        const user = await User.findOne({ email });
        if (user) {
            return res.status(403).json({ message: "Email already used, kindly use a different email or reset password" });
        }
    }
   const user= await  User.create({name,email,password:bcrypt.hashSync(password,12)});
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );

    res.json({
      message: "Registration successful",
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error during registration" });
  }
};

const userController={getAllUsers,login};
export default userController;