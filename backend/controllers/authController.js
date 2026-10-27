import User from "../models/userModel.js"
import bcrypt from "bcryptjs"
import genToken from "../config/token.js"

export const signUp =async (req,res) =>{
  try {
    const {name,email,password} = req.body
    const existEmail = await User.findOne({email})
    if(existEmail){
      return res.status(400).json({message:"email alredy exist"})
    }
    if(password.length<6){
      return res.status(400).json({message:"password must contain be 6 or more charachters"})
    }

    const hashPassword = await bcrypt.hash(password,10)

    const user = await User.create({name,password:hashPassword,email})

    const token=await genToken(user._id)

    res.cookie("token",token,{
      httpOnly:true,
      maxAge:7*24*60*60*1000,
      sameSite:"strict",
      secure:false
    })

   return res.status(201).json(user,{message:"signUp sucessfully"})

} catch (error) {
    return res.status(500).json({message:`sign up unsuccesful ${error}`})
  
} }


export const Login =async (req,res) =>{
  try {
    const {email,password} = req.body
    const user = await User.findOne({email})
    if(!user){
      return res.status(400).json({message:"email does`t exist"})
    }
    const ismatch=await bcrypt.compare(password,user.password)
    if(!ismatch){
      return res.status(400).json({message:"incorrect password"})
    }
      

    const token=await genToken(user._id)

    res.cookie("token",token,{
      httpOnly:true,
      maxAge:7*24*60*60*1000,
      sameSite:"strict",
      secure:false
    })

   return res.status(200).json(user,{message:"login  sucessfully"})

} catch (error) {
    return res.status(500).json({message:`login  unsuccesful ${error}`})
  
} }

export const logOut = async(req,res)=>{
  try {
    res.clearCookie("token")
    res.status(200).json({message:"log out sucessfully "})
  } catch (error) {
    return res.status(500).json({message:`logout unsuccesful something went wrong ${error}`})
  }
}