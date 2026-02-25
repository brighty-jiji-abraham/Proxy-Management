import { useState } from 'react'
import './App.css'
import { routes } from './Routes/Routes'
import { Route, Routes } from 'react-router-dom'
import AuthLayout from './Layout/AuthLayout'
import Login from './Components/Login'
import { useQuery } from '@tanstack/react-query'
import authSerices from './services/authSerice'
import OnamCelebration from './Components/OnamCelebration'

function App() {
  const [renderRoutes, setRenderRoutes] = useState(routes)
  const [authStatus, setAuthStatus] = useState(false)

  // const authStatusAPI = useQuery({
  //   queryFn: () => authSerices.checkUser().then((res) => {
  //     console.log("res from checkUser: ", res);
  //     if (res.data.status) {
  //       setAuthStatus(true)
  //     }
  //   })
  // })

  console.log("authStatus: ", authStatus);


  return (
    <>
      {
        authStatus ? (
          <Routes>
            <Route element={<AuthLayout />}>{renderRoutes}</Route>
          </Routes>
        ) : (
          <Routes>

            <Route path="login" element={<Login />} />
          </Routes>
        )
      }
      {/* <Login/> */}

    </>
  )
}

export default App
