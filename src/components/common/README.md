# UI foundations

## Modals

Use `AppModal` for new work. Existing features may continue using
`useResponsiveModal`; it now renders the same primitive.

### Presentations

- Desktop: centered, constrained dialog (`sm` 400, `md` 520, `lg` 680,
  `xl` 840 pixels).
- Mobile default: bottom sheet.
- Long mobile workflows: `mobilePresentation='fullscreen'`.
- Destructive confirmation: `size='sm'`, `role='alertdialog'`, and
  `closeOnBackdrop={false}`.

`AppModal` owns the header, close control, content scrolling, safe-area spacing,
and footer. Do not add another close button or duplicate the title inside the
content.

```jsx
<AppModal
  open={open}
  onClose={onClose}
  title='Create item'
  description='Add a recognizable name.'
  footer={
    <ModalActions
      secondary={{ label: 'Cancel', onClick: onClose }}
      primary={{ label: 'Create', onClick: onCreate, loading: isSaving }}
    />
  }
>
  {content}
</AppModal>
```

## Buttons

- Primary: `solid primary`; one primary action per surface.
- Secondary: `outlined neutral`.
- Tertiary: `plain neutral`.
- Destructive confirmation: `solid danger`.
- Destructive trigger: usually `outlined danger` or `plain danger`.
- Modal order: secondary first, primary last.
- Every icon-only button requires an `aria-label`.
- Use the built-in `loading` state to prevent repeated submission.

Button heights, radii, focus states, and reduced-motion behavior are defined in
`src/contexts/ThemeContext.jsx`. Avoid local overrides for those properties.

The live reference is available at `/test`.
