import { useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';

export default function TopNavBar({
  title,
  onTitleClick,
  left,
  avatarText,
  avatarAriaLabel = 'open menu',
  menuItems,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  const hasMenu = Boolean(menuItems?.length);

  return (
    <AppBar position="fixed" color="primary" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
      <Toolbar sx={{ gap: 1 }}>
        {left || null}

        {onTitleClick ? (
          <Box sx={{ flexGrow: 1, display: 'flex' }}>
            <Button color="inherit" onClick={onTitleClick} sx={{ px: 0, minWidth: 0 }}>
              <Typography variant="h6">{title}</Typography>
            </Button>
          </Box>
        ) : (
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
        )}

        {avatarText ? (
          <Box>
            <IconButton
              color="inherit"
              onClick={(e) => (hasMenu ? setAnchorEl(e.currentTarget) : undefined)}
              aria-label={avatarAriaLabel}
              disabled={!hasMenu}
            >
              <Avatar
                sx={{
                  bgcolor: 'secondary.main',
                  color: 'common.white',
                  width: 40,
                  height: 40,
                  fontWeight: 400,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {avatarText}
              </Avatar>
            </IconButton>

            {hasMenu && (
              <Menu
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                {menuItems.map((item) => (
                  <MenuItem
                    key={item.key}
                    onClick={() => {
                      setAnchorEl(null);
                      item.onClick();
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </MenuItem>
                ))}
              </Menu>
            )}
          </Box>
        ) : null}
      </Toolbar>
    </AppBar>
  );
}
