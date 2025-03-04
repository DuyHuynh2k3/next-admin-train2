
import './LoginSignup.css'
import { HiOutlineMail } from "react-icons/hi";
import { RiLockPasswordLine } from "react-icons/ri";

export default function LoginSignup() {
  return (
    <div className='container'>
        <div className="header">
            <div className="text">Login</div>
            <div className="underline"></div>
        </div>
        <div className="inputs">
            <div className="input">
            <HiOutlineMail className='mail-icons icons' />
                <input type="email" name="" id="" placeholder='Email ID' />
            </div>

            <div className="input">
            <RiLockPasswordLine  className='pass-icons icons'/>
                <input type="password" name="" id=""  placeholder='Password'/>
            </div>
        </div>
        <div className="forgot-password">Lost Password? <span>Click Here!</span></div>
        <div className="submit-container">
            <div className="submit">Login</div>
        </div>
    </div>
  )
}
