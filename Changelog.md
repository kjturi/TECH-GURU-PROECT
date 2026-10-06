# Changelog

## September 2026

### TECH-GURU-PROECT
- Rebuilt the legacy inventory dashboard from static HTML into a React 19 + Vite application.
- Introduced Firebase Firestore integration for live asset data syncing and modernized the application architecture.
- Added a unified asset model that combines the original dashboard and asset-page data structures into a single shared inventory collection.
- Built pages for dashboard, assets, categories, suppliers, reports, and approval flows to provide a complete inventory management experience.
- Added Firebase Authentication support with Google Sign-In for approver access and request review.
- Implemented the asset request and approval workflow, including request intake from Google Forms and approval actions in the web app.
- Added App Script automation to capture form submissions and write requests directly into Firestore.
- Added inventory decrement logic so approved requests reduce matching asset quantities automatically when linked to a catalog item.
- Added Firestore security rules and Firebase CLI configuration to support local development and deployment workflows.
- Included generated Data Connect scaffolding and project utility files as part of the broader app setup.
- Kept the original static prototype files as reference while transitioning the active app to the new React-based implementation.