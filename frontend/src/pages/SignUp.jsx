import React from 'react'
import bg from "../assets/authBg.png"
import { IoEye } from "react-icons/io5";
import { IoEyeOff } from "react-icons/io5";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { UserDataContext } from "../context/userContext";
import axios from "axios"
function SignUp() {


  const [showPassword, setshowPassword] = useState(false)

  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const {serverUrl,userData, setUserData} = useContext(UserDataContext)
const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const handleSignUp= async(e) =>{
    e.preventDefault()
    setErr("")
    try {
      let result = await axios.post(`${serverUrl}/api/auth/signup`,{name,email,password},{withCredentials:true})
      setUserData(result.data)
      setLoading(false)
      navigate("/customize")
    } catch (error) {
      setUserData(null)
      setLoading(false)
      setErr(error.response.data.message)
    }
  }

  return (
    <div className='w-full h-screen bg-cover flex justify-center items-center' style={{backgroundImage:`url(${bg})`}}>
      <form 
      onSubmit={handleSignUp}
      className='w-[90%] h-150 max-w-100 backdrop-blur shadow-lg shadow-blue-950 flex flex-col items-center justify-center gap-5 p-3'>

      <h1 className='text-white text-[30px] font-semibold mb-5'> Register to <span className='text-blue-800 text-[2 0px]'>virtual Assistant</span></h1>

      <input 
      value={name}
      required
      onChange={(e)=>setName(e.target.value)}
      type='text' 
      placeholder='Enter Your Name' className='w-full h-15 outline-none border-2 border-white bg-transparent text-white placeholder-gray-300 px-1 py-1 rounded-lg text-[18px] cursor-pointer'
      />

      <input 
      value={email}
      required
      onChange={(e)=>setEmail(e.target.value)}
      type='email' 
      placeholder='Enter Your Email' className='w-full h-15 outline-none border-2 border-white bg-transparent text-white placeholder-gray-300 px-1 py-1 rounded-lg text-[18px] cursor-pointer'/>

      <div className='w-full h-15  border-2 border-white bg-transparent text-white rounded-lg text-[18px] relative'>
        <input 
        value={password}
        required
        onChange={(e)=>setPassword(e.target.value)}
        type={showPassword?"text":"password"} placeholder='Enter Your password' className='w-full h-full outline-none  border-white bg-transparent text-white placeholder-gray-300 px-1 py-1 rounded-lg text-[18px] cursor-pointer'/>
        {!showPassword && <IoEye
        onClick={()=>setshowPassword(true)}
         className='absolute top-5 right-5 text-white w-5 h-5' 
        />}
         {showPassword && <IoEyeOff
        onClick={()=>setshowPassword(false)}
         className='absolute top-5 right-5 text-white w-5 h-5' 
        />}
        
      </div>
          {err.length>0 && <p className='text-red-600 text-sm'> *{err}</p>}
      <button 
      type='submit'
      className='min-w-75 h-10 bg-white rounded-full px-3 py-1 text-gray-800 font-sans text-[19px]mt-8' disabled={loading}>{loading?"Loading...":"Sign Up"}</button>

      <p 
      onClick={()=>navigate('/signin')}
      className='text-white cursor-pointer'> Alredy have an account? <span className='text-blue-800'>Sign in</span></p>
      </form>
    </div>
  )
}


export default SignUp