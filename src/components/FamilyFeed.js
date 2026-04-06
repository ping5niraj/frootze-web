/**
 * FamilyFeed.js — குடும்ப சமூக வலைதளம்
 * C:\Projects\PingMyFamily\web\src\components\FamilyFeed.js
 *
 * Social feed for verified family members.
 * Features: Create post (image/video/text), Like, Comment, Delete own post/comment
 */

import { useState, useEffect, useRef } from 'react';
import {
  Box, VStack, HStack, Text, Textarea, Button,
  Avatar, Spinner, Input, Divider, IconButton,
} from '@chakra-ui/react';
import api from '../services/api';

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'இப்போது';
  if (mins  < 60) return `${mins} நிமிடம் முன்பு`;
  if (hours < 24) return `${hours} மணி முன்பு`;
  return `${days} நாள் முன்பு`;
}

// ─────────────────────────────────────────
// CreatePost — top of feed
// ─────────────────────────────────────────
function CreatePost({ currentUser, onPostCreated }) {
  const [caption,   setCaption]   = useState('');
  const [mediaList, setMediaList] = useState([]); // [{ media_url, media_type, file }]
  const [uploading, setUploading] = useState(false);
  const [posting,   setPosting]   = useState(false);
  const [error,     setError]     = useState('');
  const fileRef = useRef();

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    setError('');

    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isImage) {
        setError('Only images and videos are allowed');
        continue;
      }

      if (isVideo) {
        // Check duration client-side
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.src = url;
        await new Promise(resolve => { video.onloadedmetadata = resolve; });
        if (video.duration > 30) {
          setError('Video must be 30 seconds or less');
          URL.revokeObjectURL(url);
          continue;
        }
        URL.revokeObjectURL(url);
      }

      setMediaList(prev => [...prev, {
        file,
        preview: URL.createObjectURL(file),
        media_type: isVideo ? 'video' : 'image',
        uploading: false,
        media_url: null,
      }]);
    }

    // Reset file input
    e.target.value = '';
  };

  const removeMedia = (index) => {
    setMediaList(prev => {
      const updated = [...prev];
      if (updated[index].preview) URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const uploadToR2 = async (file) => {
    // Upload via existing /api/photos endpoint (already uses R2)
    const formData = new FormData();
    formData.append('photo', file);
    const res = await api.post('/api/photos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.url;
  };

  const handlePost = async () => {
    if (!caption.trim() && mediaList.length === 0) {
      setError('Caption அல்லது media தேவை / Please add a caption or media');
      return;
    }

    setPosting(true);
    setError('');

    try {
      // Upload all media files to R2
      const uploadedMedia = [];
      for (const m of mediaList) {
        setUploading(true);
        const url = await uploadToR2(m.file);
        uploadedMedia.push({
          media_url:  url,
          media_type: m.media_type,
        });
      }
      setUploading(false);

      // Create post
      await api.post('/api/posts', {
        caption:    caption.trim(),
        visibility: 'family',
        media:      uploadedMedia,
      });

      // Reset form
      setCaption('');
      setMediaList([]);
      onPostCreated();

    } catch (err) {
      setError(err.response?.data?.error || 'பதிவிட முடியவில்லை / Failed to post');
    } finally {
      setPosting(false);
      setUploading(false);
    }
  };

  return (
    <Box bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"
      borderRadius="2xl" px={4} py={4}>

      <HStack spacing={3} align="flex-start">
        <Avatar size="sm" name={currentUser?.name} src={currentUser?.profile_photo}
          border="2px solid" borderColor="purple.400" />
        <VStack flex={1} spacing={3} align="stretch">
          <Textarea
            placeholder="உங்கள் குடும்பத்துடன் பகிரவும்... / Share with your family..."
            value={caption}
            onChange={e => setCaption(e.target.value)}
            bg="whiteAlpha.100"
            color="white"
            borderColor="whiteAlpha.200"
            borderRadius="xl"
            resize="none"
            rows={3}
            fontSize="sm"
            _placeholder={{ color: 'whiteAlpha.400' }}
            _focus={{ borderColor: 'purple.400', boxShadow: 'none' }}
          />

          {/* Media previews */}
          {mediaList.length > 0 && (
            <HStack spacing={2} flexWrap="wrap">
              {mediaList.map((m, idx) => (
                <Box key={idx} position="relative" w="80px" h="80px" borderRadius="lg" overflow="hidden"
                  border="1px solid" borderColor="whiteAlpha.300">
                  {m.media_type === 'image' ? (
                    <img src={m.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <video src={m.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  <Box position="absolute" top={1} right={1}
                    bg="blackAlpha.700" borderRadius="full" px={1}
                    cursor="pointer" onClick={() => removeMedia(idx)}
                    fontSize="10px" color="white" lineHeight="16px">
                    ✕
                  </Box>
                  {m.media_type === 'video' && (
                    <Box position="absolute" bottom={1} left={1}
                      fontSize="10px" bg="blackAlpha.700" borderRadius="md" px={1} color="white">
                      🎬
                    </Box>
                  )}
                </Box>
              ))}
            </HStack>
          )}

          {error && (
            <Text color="red.300" fontSize="xs">{error}</Text>
          )}

          <HStack justify="space-between">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileRef}
              style={{ display: 'none' }}
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
            />
            <HStack spacing={2}>
              <Button size="sm" variant="ghost" color="whiteAlpha.600"
                _hover={{ color: 'white' }}
                onClick={() => fileRef.current?.click()}>
                📷 படம்
              </Button>
              <Button size="sm" variant="ghost" color="whiteAlpha.600"
                _hover={{ color: 'white' }}
                onClick={() => fileRef.current?.click()}>
                🎬 வீடியோ
              </Button>
            </HStack>
            <Button size="sm"
              bgGradient="linear(to-r, purple.600, green.500)"
              color="white" borderRadius="xl" fontWeight="700"
              isLoading={posting || uploading}
              loadingText={uploading ? 'Uploading...' : 'Posting...'}
              onClick={handlePost}
              isDisabled={!caption.trim() && mediaList.length === 0}>
              பகிர் / Share
            </Button>
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );
}

// ─────────────────────────────────────────
// CommentSection — inline comments for a post
// ─────────────────────────────────────────
function CommentSection({ postId, currentUserId, commentCount }) {
  const [open,     setOpen]     = useState(false);
  const [comments, setComments] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [text,     setText]     = useState('');
  const [sending,  setSending]  = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/posts/${postId}/comments`);
      setComments(res.data.comments || []);
    } catch (e) {}
    finally { setLoading(false); }
  };

  const handleOpen = () => {
    setOpen(prev => {
      if (!prev) load();
      return !prev;
    });
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/api/posts/${postId}/comments`, { content: text.trim() });
      setComments(prev => [...prev, res.data.comment]);
      setText('');
    } catch (e) {}
    finally { setSending(false); }
  };

  const handleDelete = async (commentId) => {
    try {
      await api.delete(`/api/posts/${postId}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (e) {}
  };

  return (
    <VStack align="stretch" spacing={0}>
      <Button size="xs" variant="ghost" color="whiteAlpha.500"
        _hover={{ color: 'white' }} alignSelf="flex-start"
        onClick={handleOpen}>
        💬 {commentCount > 0 ? `${commentCount} கருத்து` : 'கருத்து சேர்'}
      </Button>

      {open && (
        <VStack align="stretch" spacing={2} mt={2}
          bg="whiteAlpha.50" borderRadius="xl" p={3}>

          {loading && <Spinner size="sm" color="purple.300" alignSelf="center" />}

          {comments.map(c => (
            <HStack key={c.id} spacing={2} align="flex-start">
              <Avatar size="xs" name={c.user?.name} src={c.user?.profile_photo} />
              <Box flex={1} bg="whiteAlpha.100" borderRadius="lg" px={3} py={2}>
                <HStack justify="space-between">
                  <Text fontSize="xs" fontWeight="700" color="purple.300">{c.user?.name}</Text>
                  <Text fontSize="9px" color="whiteAlpha.400">{timeAgo(c.created_at)}</Text>
                </HStack>
                <Text fontSize="xs" color="whiteAlpha.800" mt={1}>{c.content}</Text>
              </Box>
              {c.user?.id === currentUserId && (
                <Button size="xs" variant="ghost" color="whiteAlpha.300"
                  _hover={{ color: 'red.300' }} px={1}
                  onClick={() => handleDelete(c.id)}>
                  ✕
                </Button>
              )}
            </HStack>
          ))}

          {/* Add comment input */}
          <HStack spacing={2}>
            <Input
              placeholder="கருத்து எழுதுங்கள்..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              size="sm"
              bg="whiteAlpha.100"
              color="white"
              borderColor="whiteAlpha.200"
              borderRadius="xl"
              fontSize="xs"
              _placeholder={{ color: 'whiteAlpha.400' }}
              _focus={{ borderColor: 'purple.400', boxShadow: 'none' }}
            />
            <Button size="sm" colorScheme="purple" borderRadius="xl"
              isLoading={sending}
              isDisabled={!text.trim()}
              onClick={handleSend}>
              ↑
            </Button>
          </HStack>
        </VStack>
      )}
    </VStack>
  );
}

// ─────────────────────────────────────────
// PostCard — single post in the feed
// ─────────────────────────────────────────
function PostCard({ post, currentUserId, onDeleted }) {
  const [liked,      setLiked]      = useState(post.did_i_like);
  const [likeCount,  setLikeCount]  = useState(post.like_count);
  const [liking,     setLiking]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);

  const isOwner = post.user?.id === currentUserId;

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    // Optimistic update
    setLiked(prev => !prev);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    try {
      const res = await api.post(`/api/posts/${post.id}/like`);
      setLiked(res.data.liked);
      setLikeCount(res.data.like_count);
    } catch (e) {
      // Revert on error
      setLiked(prev => !prev);
      setLikeCount(prev => liked ? prev + 1 : prev - 1);
    } finally { setLiking(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('இந்த பதிவை நீக்கவா? / Delete this post?')) return;
    setDeleting(true);
    try {
      await api.delete(`/api/posts/${post.id}`);
      onDeleted(post.id);
    } catch (e) {}
    finally { setDeleting(false); }
  };

  const media = post.media || [];

  return (
    <Box bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"
      borderRadius="2xl" overflow="hidden">

      {/* Post header */}
      <HStack justify="space-between" px={4} pt={4} pb={2}>
        <HStack spacing={3}>
          <Avatar size="sm" name={post.user?.name} src={post.user?.profile_photo}
            border="2px solid" borderColor="purple.400" />
          <Box>
            <Text fontSize="sm" fontWeight="700" color="white">{post.user?.name}</Text>
            <HStack spacing={1}>
              {post.user?.kutham && (
                <Text fontSize="9px" color="purple.300">{post.user.kutham}</Text>
              )}
              <Text fontSize="9px" color="whiteAlpha.400">• {timeAgo(post.created_at)}</Text>
            </HStack>
          </Box>
        </HStack>
        {isOwner && (
          <Button size="xs" variant="ghost" color="whiteAlpha.300"
            _hover={{ color: 'red.300' }}
            isLoading={deleting}
            onClick={handleDelete}>
            🗑
          </Button>
        )}
      </HStack>

      {/* Caption */}
      {post.caption && (
        <Text fontSize="sm" color="whiteAlpha.800" px={4} pb={3} lineHeight="1.6">
          {post.caption}
        </Text>
      )}

      {/* Media */}
      {media.length > 0 && (
        <Box position="relative" bg="black">
          {media[mediaIndex].media_type === 'image' ? (
            <img
              src={media[mediaIndex].media_url}
              alt=""
              style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }}
            />
          ) : (
            <video
              src={media[mediaIndex].media_url}
              controls
              style={{ width: '100%', maxHeight: '400px', display: 'block' }}
            />
          )}

          {/* Multi-media navigation dots */}
          {media.length > 1 && (
            <HStack position="absolute" bottom={2} left={0} right={0}
              justify="center" spacing={1}>
              {media.map((_, idx) => (
                <Box key={idx} w={idx === mediaIndex ? '16px' : '6px'} h="6px"
                  borderRadius="full"
                  bg={idx === mediaIndex ? 'purple.400' : 'whiteAlpha.500'}
                  cursor="pointer"
                  transition="all 0.2s"
                  onClick={() => setMediaIndex(idx)} />
              ))}
            </HStack>
          )}

          {/* Swipe arrows for multi-media */}
          {media.length > 1 && (
            <>
              {mediaIndex > 0 && (
                <Box position="absolute" left={2} top="50%" transform="translateY(-50%)"
                  bg="blackAlpha.600" borderRadius="full" p={1} cursor="pointer"
                  onClick={() => setMediaIndex(prev => prev - 1)}
                  color="white" fontSize="sm">
                  ‹
                </Box>
              )}
              {mediaIndex < media.length - 1 && (
                <Box position="absolute" right={2} top="50%" transform="translateY(-50%)"
                  bg="blackAlpha.600" borderRadius="full" p={1} cursor="pointer"
                  onClick={() => setMediaIndex(prev => prev + 1)}
                  color="white" fontSize="sm">
                  ›
                </Box>
              )}
            </>
          )}
        </Box>
      )}

      {/* Like + Comment actions */}
      <VStack align="stretch" px={4} pt={3} pb={4} spacing={2}>
        <HStack spacing={4}>
          <Button size="sm" variant="ghost"
            color={liked ? 'red.400' : 'whiteAlpha.500'}
            _hover={{ color: 'red.300' }}
            leftIcon={<Text>{liked ? '❤️' : '🤍'}</Text>}
            onClick={handleLike}
            isLoading={liking}>
            <Text fontSize="sm">{likeCount > 0 ? likeCount : ''}</Text>
          </Button>
        </HStack>

        <Divider borderColor="whiteAlpha.100" />

        <CommentSection
          postId={post.id}
          currentUserId={currentUserId}
          commentCount={post.comment_count}
        />
      </VStack>
    </Box>
  );
}

// ─────────────────────────────────────────
// Main FamilyFeed Component
// ─────────────────────────────────────────
export default function FamilyFeed({ currentUser }) {
  const [posts,    setPosts]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [loadMore, setLoadMore] = useState(false);
  const [hasMore,  setHasMore]  = useState(true);
  const [page,     setPage]     = useState(1);
  const [error,    setError]    = useState(null);

  useEffect(() => { loadFeed(1, true); }, [currentUser.id]);

  const loadFeed = async (pageNum = 1, reset = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadMore(true);
    setError(null);

    try {
      const res = await api.get(`/api/posts/feed?page=${pageNum}&limit=20`);
      const newPosts = res.data.posts || [];

      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }

      setHasMore(res.data.has_more);
      setPage(pageNum);
    } catch (e) {
      setError('பதிவுகளை ஏற்றுவதில் பிழை / Error loading feed');
    } finally {
      setLoading(false);
      setLoadMore(false);
    }
  };

  const handlePostCreated = () => {
    // Reload feed from page 1 after new post
    loadFeed(1, true);
  };

  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <VStack w="100%" spacing={4} align="stretch">

      {/* Create post box */}
      <CreatePost currentUser={currentUser} onPostCreated={handlePostCreated} />

      {/* Loading state */}
      {loading && (
        <VStack py={10}>
          <Spinner color="purple.300" size="lg" />
          <Text color="whiteAlpha.500" fontSize="sm">பதிவுகள் ஏற்றுகிறோம்...</Text>
        </VStack>
      )}

      {/* Error state */}
      {error && (
        <Text color="red.300" textAlign="center" py={4}>{error}</Text>
      )}

      {/* Empty state */}
      {!loading && !error && posts.length === 0 && (
        <VStack py={10} spacing={3}>
          <Text fontSize="4xl">📭</Text>
          <Text color="whiteAlpha.500" fontSize="sm" textAlign="center">
            இன்னும் பதிவுகள் இல்லை.<br />
            முதல் பதிவை பகிரவும்!
          </Text>
        </VStack>
      )}

      {/* Feed posts */}
      {!loading && posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUser.id}
          onDeleted={handlePostDeleted}
        />
      ))}

      {/* Load more */}
      {!loading && hasMore && posts.length > 0 && (
        <Button
          variant="ghost" color="whiteAlpha.500"
          _hover={{ color: 'white' }}
          isLoading={loadMore}
          onClick={() => loadFeed(page + 1, false)}>
          மேலும் பதிவுகள் / Load more
        </Button>
      )}

    </VStack>
  );
}
