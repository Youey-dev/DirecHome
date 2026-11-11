import { viewsLabel } from '../src/lib/viewCount';

export function runExampleTests() {
  // View count (owner and admins only): "views", not "people"
  if (viewsLabel({ viewsCount: 51 }) !== '51 views') throw new Error('51 views should show as "51 views"');
  if (viewsLabel({ viewsCount: 1234 }) !== '1,234 views') throw new Error('Large view counts need a thousands separator');
  if (viewsLabel({ viewsCount: 1 }) !== '1 view') throw new Error('One view is "1 view"');

}
