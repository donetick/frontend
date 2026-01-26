import App from '@/App'
import ChoreEdit from '@/views/ChoreEdit/ChoreEdit'
import Error from '@/views/Error'
import AccountSettings from '@/views/Settings/AccountSettings'
import AdvancedSettings from '@/views/Settings/AdvancedSettings'
import ChildUserSettings from '@/views/Settings/ChildUserSettings'
import CircleSettings from '@/views/Settings/CircleSettings'
import DeveloperSettings from '@/views/Settings/DeveloperSettings'
import Settings from '@/views/Settings/Settings'
import SettingsOverview from '@/views/Settings/SettingsOverview'
import SettingsRoutes from '@/views/Settings/SettingsRoutes'
import ThemeSettings from '@/views/Settings/ThemeSettings'
import { Capacitor } from '@capacitor/core'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import AuthenticationLoading from '../views/Authorization/Authenticating'
import ForgotPasswordView from '../views/Authorization/ForgotPasswordView'
import LoginSettings from '../views/Authorization/LoginSettings'
import LoginView from '../views/Authorization/LoginView'
import SignupView from '../views/Authorization/Signup'
import UpdatePasswordView from '../views/Authorization/UpdatePasswordView'
import ChoreView from '../views/ChoreEdit/ChoreView'
import ArchivedTasks from '../views/Chores/ArchivedTasks'
import MyChores from '../views/Chores/MyChores'
import JoinCircleView from '../views/Circles/JoinCircle'
import NotFound from '../views/components/NotFound'
import ChoreHistory from '../views/History/ChoreHistory'
import LabelView from '../views/Labels/LabelView'
import Landing from '../views/Landing/Landing'
import PaymentCancelledView from '../views/Payments/PaymentFailView'
import PaymentSuccessView from '../views/Payments/PaymentSuccessView'
import PrivacyPolicyView from '../views/PrivacyPolicy/PrivacyPolicyView'
import ProjectView from '../views/Projects/ProjectView'
import FilterView from '../views/Filters/FilterView'
import APITokenSettings from '../views/Settings/APITokenSettings'
import MFASettings from '../views/Settings/MFASettings'
import NotificationSetting from '../views/Settings/NotificationSetting'
import ProfileSettings from '../views/Settings/ProfileSettings'
import SidepanelSettings from '../views/Settings/SidepanelSettings'
import StorageSettings from '../views/Settings/StorageSettings'
import TermsView from '../views/Terms/TermsView'
import TestView from '../views/TestView/Test'
import ThingsHistory from '../views/Things/ThingsHistory'
import ThingsView from '../views/Things/ThingsView'
import TimerDetails from '../views/Timer/TimerDetails'
import UserActivities from '../views/User/UserActivities'
import UserPoints from '../views/User/UserPoints'
const getMainRoute = () => {
  if (
    import.meta.env.VITE_IS_LANDING_DEFAULT === 'true' &&
    !Capacitor.isNativePlatform()
  ) {
    return <Landing />
  }
  return <MyChores />
}
const Router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <Error />,
    children: [
      {
        path: '/',
        element: getMainRoute(),
      },
      {
        path: '/settings',
        element: <SettingsRoutes />,
        children: [
          {
            index: true,
            element: <SettingsOverview />,
          },
          {
            path: 'detailed',
            element: <Settings />,
          },
          {
            path: 'profile',
            element: <ProfileSettings />,
          },
          {
            path: 'circle',
            element: <CircleSettings />,
          },
          {
            path: 'account',
            element: <AccountSettings />,
          },
          {
            path: 'subaccounts',
            element: <ChildUserSettings />,
          },
          {
            path: 'notifications',
            element: <NotificationSetting />,
          },
          {
            path: 'mfa',
            element: <MFASettings />,
          },
          {
            path: 'apitokens',
            element: <APITokenSettings />,
          },
          {
            path: 'storage',
            element: <StorageSettings />,
          },
          {
            path: 'sidepanel',
            element: <SidepanelSettings />,
          },
          {
            path: 'theme',
            element: <ThemeSettings />,
          },
          {
            path: 'advanced',
            element: <AdvancedSettings />,
          },
          {
            path: 'developer',
            element: <DeveloperSettings />,
          },
        ],
      },
      {
        path: '/chores',
        element: <MyChores />,
      },
      {
        path: '/archived',
        element: <ArchivedTasks />,
      },
      {
        path: '/chores/:choreId/edit',
        element: <ChoreEdit />,
      },
      {
        path: '/chores/:choreId',
        element: <ChoreView />,
      },
      {
        path: '/chores/create',
        element: <ChoreEdit />,
      },
      {
        path: '/chores/:choreId/history',
        element: <ChoreHistory />,
      },
      {
        path: '/chores/:choreId/timer',
        element: <TimerDetails />,
      },
      {
        path: '/my/chores',
        element: <MyChores />,
      },
      {
        path: '/activities',
        element: <UserActivities />,
      },
      {
        path: '/points',
        element: <UserPoints />,
      },
      {
        path: '/login',
        element: <LoginView />,
      },
      {
        path: '/login/settings',
        element: <LoginSettings />,
      },
      {
        path: '/signup',
        element: <SignupView />,
      },

      {
        path: '/auth/:provider',
        element: <AuthenticationLoading />,
      },
      {
        path: '/landing',
        element: <Landing />,
      },
      {
        path: '/test',
        element: <TestView />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPasswordView />,
      },
      {
        path: '/password/update',
        element: <UpdatePasswordView />,
      },
      {
        path: '/privacy',
        element: <PrivacyPolicyView />,
      },
      {
        path: '/terms',
        element: <TermsView />,
      },
      {
        path: 'circle/join',
        element: <JoinCircleView />,
      },
      {
        path: 'payments/success',
        element: <PaymentSuccessView />,
      },
      {
        path: 'payments/cancel',
        element: <PaymentCancelledView />,
      },
      {
        path: 'things',
        element: <ThingsView />,
      },
      {
        path: 'things/:id',
        element: <ThingsHistory />,
      },
      {
        path: 'labels/',
        element: <LabelView />,
      },
      {
        path: 'projects/',
        element: <ProjectView />,
      },
      {
        path: 'filters/',
        element: <FilterView />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])

const RouterContext = ({ children }) => {
  return <RouterProvider router={Router} />
}

export default RouterContext
