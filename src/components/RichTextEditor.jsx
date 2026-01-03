import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import LinkIcon from '@mui/icons-material/Link';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  ariaLabel,
  readOnly = false,
  showToolbar = true,
  contentPadding,
}) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: false,
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({
        openOnClick: readOnly,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
    ],
    [readOnly],
  );

  const editor = useEditor({
    extensions,
    content: value || '',
    editorProps: {
      attributes: {
        'aria-label': ariaLabel || 'rich text editor',
        class: 'tiptap',
      },
    },
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onChange?.(html);
    },
  });

  const [, forceRerender] = useState(0);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkHref, setLinkHref] = useState('');

  useEffect(() => {
    if (!editor) return undefined;
    const rerender = () => forceRerender((v) => v + 1);
    editor.on('selectionUpdate', rerender);
    editor.on('transaction', rerender);
    return () => {
      editor.off('selectionUpdate', rerender);
      editor.off('transaction', rerender);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor) return;
    const next = value || '';
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next, false);
    }
  }, [editor, value]);
  const handleOpenLinkDialog = () => {
    if (!editor) return;
    const currentHref = editor.getAttributes('link')?.href || '';
    setLinkHref(currentHref);
    setLinkOpen(true);
  };

  const handleSaveLink = () => {
    if (!editor) {
      setLinkOpen(false);
      return;
    }
    const trimmed = (linkHref || '').trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setLinkOpen(false);
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: trimmed })
      .run();
    setLinkOpen(false);
  };

  const handleRemoveLink = () => {
    if (!editor) {
      setLinkOpen(false);
      return;
    }
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setLinkOpen(false);
  };

  return (
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
      {editor && showToolbar && !readOnly ? (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 150, placement: 'top' }}
          shouldShow={({ editor: ed }) => {
            if (!ed.isFocused) return false;
            return !ed.state.selection.empty;
          }}
        >
          <Paper
            elevation={8}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              px: 0.5,
              py: 0.25,
              borderRadius: 999,
              bgcolor: 'background.paper',
            }}
          >
            <Tooltip title="Bold">
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleBold().run()}
                color={editor.isActive('bold') ? 'primary' : 'default'}
              >
                <FormatBoldIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Italic">
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                color={editor.isActive('italic') ? 'primary' : 'default'}
              >
                <FormatItalicIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Underline">
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                color={editor.isActive('underline') ? 'primary' : 'default'}
              >
                <FormatUnderlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Strike">
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                color={editor.isActive('strike') ? 'primary' : 'default'}
              >
                <StrikethroughSIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            <Tooltip title="Bullet list">
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                color={editor.isActive('bulletList') ? 'primary' : 'default'}
              >
                <FormatListBulletedIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            <Tooltip title="Link">
              <IconButton
                size="small"
                onClick={handleOpenLinkDialog}
                color={editor.isActive('link') ? 'primary' : 'default'}
              >
                <LinkIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Paper>
        </BubbleMenu>
      ) : null}

      <Box
        sx={{
          width: '100%',
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          ...(contentPadding || null),
          '& .tiptap': {
            outline: 'none',
            minHeight: '100%',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          },
          '& .tiptap p': { margin: 0 },
          '& .tiptap ul': { marginTop: 0, marginBottom: 0, paddingLeft: 3 },
          '& .tiptap a': {
            color: 'primary.main',
            pointerEvents: readOnly ? 'auto' : 'none',
            textDecoration: 'underline',
          },
        }}
      >
        {placeholder && (!editor || editor.isEmpty) ? (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              color: 'text.secondary',
              ...(contentPadding || null),
            }}
          >
            {placeholder}
          </Box>
        ) : null}

        <EditorContent editor={editor} />
      </Box>

      <Dialog open={linkOpen} onClose={() => setLinkOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Insertar enlace</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ pt: 1 }}>
            <TextField
              label="URL"
              value={linkHref}
              onChange={(e) => setLinkHref(e.target.value)}
              placeholder="https://example.com"
              autoFocus
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button onClick={handleRemoveLink} color="inherit">
            Quitar
          </Button>
          <Button onClick={handleSaveLink} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
