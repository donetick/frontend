import { lazy } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'

import App from '@/App'
import Error from '@/views/Error'
import SettingsRoutes from '@/views/Settings/SettingsRoutes'

const ChoreEdit = lazy(() => import('@/views/ChoreEdit/ChoreEdit'))
const AccountSettings = lazy(() => import('@/views/Settings/AccountSettings'))
const AdvancedSettings = lazy(() => import('@/views/Settings/AdvancedSettings'))
const BridgeSettings = lazy(() => import('@/views/Settings/BridgeSettings'))
const ChildUserSettings = lazy(
  () => import('@/views/Settings/ChildUserSettings'),
)
const CircleSettings = lazy(() => import('@/views/Settings/CircleSettings'))
const DeveloperSettings = lazy(
  () => import('@/views/Settings/DeveloperSettings'),
)
const Settings = lazy(() => import('@/views/Settings/Settings'))
const SettingsOverview = lazy(() => import('@/views/Settings/SettingsOverview'))
const ThemeSettings = lazy(() => import('@/views/Settings/ThemeSettings'))

const GlobalSearchPage = lazy(() => import('../search/GlobalSearchPage'))
const AuthenticationLoading = lazy(
  () => import('../views/Authorization/Authenticating'),
)
const ForgotPasswordView = lazy(
  () => import('../views/Authorization/ForgotPasswordView'),
)
const LoginSettings = lazy(() => import('../views/Authorization/LoginSettings'))
const LoginView = lazy(() => import('../views/Authorization/LoginView'))
const SignupView = lazy(() => import('../views/Authorization/Signup'))
const UpdatePasswordView = lazy(
  () => import('../views/Authorization/UpdatePasswordView'),
)
const ChoreView = lazy(() => import('../views/ChoreEdit/ChoreView'))
const ArchivedTasks = lazy(() => import('../views/Chores/ArchivedTasks'))
const MyChores = lazy(() => import('../views/Chores/MyChores'))
const JoinCircleView = lazy(() => import('../views/Circles/JoinCircle'))
const NotFound = lazy(() => import('../views/components/NotFound'))
const FilterView = lazy(() => import('../views/Filters/FilterView'))
const ChoreHistory = lazy(() => import('../views/History/ChoreHistory'))
const DefaultViewRoute = lazy(() => import('../views/Home/DefaultViewRoute'))
const HomeView = lazy(() => import('../views/Home/HomeView'))
const LabelDetailView = lazy(() => import('../views/Labels/LabelDetailView'))
const LabelView = lazy(() => import('../views/Labels/LabelView'))
const Landing = lazy(() => import('../views/Landing/Landing'))
const CircleSetupView = lazy(
  () => import('../views/Onboarding/CircleSetupView'),
)
const GetStartedView = lazy(() => import('../views/Onboarding/GetStartedView'))
const HeardAboutView = lazy(() => import('../views/Onboarding/HeardAboutView'))
const OnboardingView = lazy(() => import('../views/Onboarding/OnboardingView'))
const WorkspaceReadyView = lazy(
  () => import('../views/Onboarding/WorkspaceReadyView'),
)
const PaymentCancelledView = lazy(
  () => import('../views/Payments/PaymentFailView'),
)
const PaymentSuccessView = lazy(
  () => import('../views/Payments/PaymentSuccessView'),
)
const PrivacyPolicyView = lazy(
  () => import('../views/PrivacyPolicy/PrivacyPolicyView'),
)
const ProjectView = lazy(() => import('../views/Projects/ProjectView'))
const APITokenSettings = lazy(
  () => import('../views/Settings/APITokenSettings'),
)
const CalendarSettings = lazy(
  () => import('../views/Settings/CalendarSettings'),
)
const HomeSectionsSettings = lazy(
  () => import('../views/Settings/HomeSectionsSettings'),
)
const IntegrationsSettings = lazy(
  () => import('../views/Settings/IntegrationsSettings'),
)
const LayoutSettings = lazy(() => import('../views/Settings/LayoutSettings'))
const LocalizationSettings = lazy(
  () => import('../views/Settings/LocalizationSettings'),
)
const MFASettings = lazy(() => import('../views/Settings/MFASettings'))
const NotificationIntegrationsSettings = lazy(
  () => import('../views/Settings/NotificationIntegrationsSettings'),
)
const NotificationSetting = lazy(
  () => import('../views/Settings/NotificationSetting'),
)
const PrivacyAnalyticsSettings = lazy(
  () => import('../views/Settings/PrivacyAnalyticsSettings'),
)
const ProfileSettings = lazy(() => import('../views/Settings/ProfileSettings'))
const StorageSettings = lazy(() => import('../views/Settings/StorageSettings'))
const WebhookSettings = lazy(() => import('../views/Settings/WebhookSettings'))
const WidgetSettings = lazy(() => import('../views/Settings/WidgetSettings'))
import TemplatesView from '../views/Templates/TemplatesView'
const TermsView = lazy(() => import('../views/Terms/TermsView'))
const TestView = lazy(() => import('../views/TestView/Test'))
const ThingsHistory = lazy(() => import('../views/Things/ThingsHistory'))
const ThingsView = lazy(() => import('../views/Things/ThingsView'))
const TimerDetails = lazy(() => import('../views/Timer/TimerDetails'))
const UserActivities = lazy(() => import('../views/User/UserActivities'))
const UserPoints = lazy(() => import('../views/User/UserPoints'))
const Router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <Error />,
    children: [
      {
        path: '/',
        element: <DefaultViewRoute />,
      },
      {
        path: '/home',
        element: <HomeView />,
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
            path: 'webhooks',
            element: <WebhookSettings />,
          },
          {
            path: 'integrations',
            element: <IntegrationsSettings />,
          },
          {
            path: 'notification-integrations',
            element: <NotificationIntegrationsSettings />,
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
            path: 'bridge',
            element: <BridgeSettings />,
          },
          {
            path: 'calendar',
            element: <CalendarSettings />,
          },
          {
            path: 'storage',
            element: <StorageSettings />,
          },
          {
            path: 'home-sections',
            element: <HomeSectionsSettings />,
          },
          {
            path: 'layout',
            element: <LayoutSettings />,
          },
          {
            path: 'theme',
            element: <ThemeSettings />,
          },
          {
            path: 'widgets',
            element: <WidgetSettings />,
          },
          {
            path: 'localization',
            element: <LocalizationSettings />,
          },
          {
            path: 'advanced',
            element: <AdvancedSettings />,
          },
          {
            path: 'privacy',
            element: <PrivacyAnalyticsSettings />,
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
        path: '/search',
        element: <GlobalSearchPage />,
      },
      {
        path: '/templates',
        element: <TemplatesView />,
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
        path: '/onboarding',
        element: <OnboardingView />,
      },
      {
        path: '/get-started',
        element: <GetStartedView />,
      },
      {
        path: '/ready',
        element: <WorkspaceReadyView />,
      },
      {
        path: '/circle-setup',
        element: <CircleSetupView />,
      },
      {
        path: '/heard-about',
        element: <HeardAboutView />,
      },

      {
        path: '/auth/:provider',
        element: <AuthenticationLoading />,
      },
      {
        path: '/welcome',
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
        path: 'labels/:labelId',
        element: <LabelDetailView />,
      },
      {
        path: 'rewards/',
        element: <Navigate to='/points?tab=rewards' replace />,
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
