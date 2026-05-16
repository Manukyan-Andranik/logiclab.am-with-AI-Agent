import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

// Reset scroll on every route change.
//
// We use useLayoutEffect (not useEffect) so the scroll happens synchronously
// before the browser paints the next frame — the user never sees the old
// scroll position on the new page.
//
// We use `behavior: "instant"` (not "smooth"). Smooth-scrolling between
// routes races with MainLayout's AnimatePresence mode="wait" page
// transition: the document height collapses mid-animation when the previous
// (often much taller) page unmounts, the smooth-scroll target gets clamped,
// and the user lands somewhere below the new page's content. Symptom: after
// navigating from a tall page like CourseDetailPage to RegisterPage, the
// registration form sits offscreen until the page is refreshed.
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
