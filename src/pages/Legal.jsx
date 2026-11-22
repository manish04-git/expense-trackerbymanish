import { Link } from 'react-router-dom'

const CONTENT = {
  privacy: {
    title: 'Privacy Policy',
    sections: [
      ['What we store', 'Your account email, display name and the financial records you enter (transactions, accounts, budgets, goals, subscriptions and settings). Passwords are handled by Firebase Authentication and are never stored in the database.'],
      ['How it is protected', 'Data is stored in Google Cloud Firestore. Security Rules ensure that only you can read or change your own records. Connections use HTTPS.'],
      ['How it is used', 'Only to run the app for you. Insights are computed in your browser from your own data. No data is sold or shared, and no third-party AI service receives your data.'],
      ['Analytics', 'If enabled by the operator, Firebase Analytics may collect anonymous usage statistics such as page views.'],
      ['Your controls', 'You can export all your data, restore it, or permanently delete your account and every record from Settings at any time.'],
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    sections: [
      ['Use of the service', 'Expense Tracker is a personal record-keeping tool. You are responsible for the accuracy of the information you enter.'],
      ['Not financial advice', 'Reports, budgets and insights are informational only and are not financial, tax or legal advice.'],
      ['Availability', 'The service runs on free-tier infrastructure and is provided "as is" without warranty. Features may be limited or temporarily unavailable if usage quotas are exceeded.'],
      ['Recurring items', 'Recurring transactions are generated when you open the app; they do not run while the app is closed.'],
      ['Termination', 'You may delete your account at any time from Settings.'],
    ],
  },
}

export default function Legal({ page }) {
  const doc = CONTENT[page]
  return (
    <div className="mx-auto max-w-2xl p-6 py-10">
      <Link to="/" className="text-sm text-primary hover:underline">&larr; Back</Link>
      <h1 className="mt-4 text-2xl font-semibold">{doc.title}</h1>
      <p className="mt-1 text-xs text-muted">Template text for the project. Have it reviewed by a legal professional and add your business details before public launch.</p>
      <div className="mt-6 space-y-5">
        {doc.sections.map(([h, t]) => (
          <section key={h}><h2 className="font-medium">{h}</h2><p className="mt-1 text-sm text-muted">{t}</p></section>
        ))}
      </div>
    </div>
  )
}
