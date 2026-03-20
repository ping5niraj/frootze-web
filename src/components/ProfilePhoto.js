import { useState, useRef } from 'react';
import { Box, Avatar, Text, Spinner } from '@chakra-ui/react';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_PMF_API || 'https://pingmyfamily-backend-production.up.railway.app';

export default function ProfilePhoto({ user, onPhotoUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5MB');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const token = localStorage.getItem('pmf_token');
      const res = await axios.post(`${BASE_URL}/api/photos/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      onPhotoUpdated(res.data.photo_url);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center" gap={2}>

      {/* Clickable photo */}
      <Box
        position="relative"
        cursor="pointer"
        onClick={handleClick}
        borderRadius="full"
        overflow="hidden"
        border="3px solid"
        borderColor="purple.400"
        w="72px" h="72px"
        boxShadow="0 4px 14px rgba(128,0,255,0.3)"
        _hover={{ opacity: 0.8 }}
        transition="all 0.2s"
      >
        <Avatar
          size="full"
          name={user?.name}
          src={user?.profile_photo}
          w="72px" h="72px"
        />

        {/* Overlay */}
        <Box
          position="absolute" inset={0}
          bg="blackAlpha.600"
          display="flex" alignItems="center" justifyContent="center"
          borderRadius="full"
        >
          {uploading ? (
            <Spinner color="white" size="sm" />
          ) : (
            <Text fontSize="xl">📷</Text>
          )}
        </Box>
      </Box>

      {/* Tap hint */}
      <Text
        fontSize="xs" color="purple.300" cursor="pointer"
        onClick={handleClick}
        _hover={{ color: 'white' }}
      >
        {uploading ? 'Uploading...' : 'Tap to change photo'}
      </Text>

      {error && <Text fontSize="xs" color="red.300">{error}</Text>}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </Box>
  );
}
