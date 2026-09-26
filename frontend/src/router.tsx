import React, { useEffect } from 'react'
import { createRootRoute, createRoute, createRouter, Link as TanLink, Outlet, RouterProvider as TanRouterProvider, useLocation as tanUseLocation, useNavigate as tanUseNavigate } from '@tanstack/react-router'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Header from './components/Header'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Accounts from './pages/Accounts'
import Categories from './pages/Categories'
import Budgets from './pages/Budgets'
import Reports from './pages/Reports'

export const Link=TanLink
export const useNavigate=()=>tanUseNavigate()
export const useLocation=()=>tanUseLocation()
export function Navigate({to,replace=false,state}) {
  const navigate=tanUseNavigate()
  useEffect(()=>{ navigate({to,replace,state}) },[navigate,to,replace,state])
  return null
}

function Layout(){
  return <AuthProvider><div className="app"><Header/><main className="main-content"><Outlet/></main></div></AuthProvider>
}
const root=createRootRoute({component:Layout})
const protectedElement=(Component)=> <ProtectedRoute><Component/></ProtectedRoute>
const routes=[
  createRoute({getParentRoute:()=>root,path:"/login",component:Login}),
  createRoute({getParentRoute:()=>root,path:"/register",component:Register}),
  createRoute({getParentRoute:()=>root,path:"/",component:()=>protectedElement(Dashboard)}),
  createRoute({getParentRoute:()=>root,path:"/transactions",component:()=>protectedElement(Transactions)}),
  createRoute({getParentRoute:()=>root,path:"/accounts",component:()=>protectedElement(Accounts)}),
  createRoute({getParentRoute:()=>root,path:"/categories",component:()=>protectedElement(Categories)}),
  createRoute({getParentRoute:()=>root,path:"/budgets",component:()=>protectedElement(Budgets)}),
  createRoute({getParentRoute:()=>root,path:"/reports",component:()=>protectedElement(Reports)})
]
const routeTree=root.addChildren(routes)
export const router=createRouter({routeTree})
export const RouterProvider=()=> <TanRouterProvider router={router}/>
