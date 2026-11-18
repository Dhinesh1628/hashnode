import { Link } from 'react-router';
import { useTitle } from '../lib/useTitle.js';

export default function NotFound({ message = "We couldn't find that page." }) {
  useTitle('Not found');
  return (
    <div className="empty not-found">
      <h1>404</h1>
      <p>{message}</p>
      <Link to="/" className="btn btn-primary">Back to the feed</Link>
    </div>
  );
}
