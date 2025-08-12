import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Image,
  ImageStyle,
  ViewStyle,
  ActivityIndicator,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LazyImageProps {
  source: { uri: string } | number;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  placeholder?: React.ReactNode;
  errorPlaceholder?: React.ReactNode;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onLoad?: () => void;
  onError?: () => void;
  showLoadingIndicator?: boolean;
  showErrorIcon?: boolean;
}

const LazyImage = memo<LazyImageProps>(({
  source,
  style,
  containerStyle,
  placeholder,
  errorPlaceholder,
  resizeMode = 'cover',
  onLoad,
  onError,
  showLoadingIndicator = true,
  showErrorIcon = true,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
    onError?.();
  }, [onError]);

  const defaultStyle: ImageStyle = {
    width: 150,
    height: 120,
    backgroundColor: '#2a2a2a',
    ...style,
  };

  const defaultContainerStyle: ViewStyle = {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    ...defaultStyle,
    ...containerStyle,
  };

  if (error) {
    if (errorPlaceholder) {
      return <View style={defaultContainerStyle}>{errorPlaceholder}</View>;
    }

    return (
      <View style={defaultContainerStyle}>
        {showErrorIcon && (
          <>
            <Ionicons name="image-outline" size={32} color="#666" />
            <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
              Failed to load
            </Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={defaultContainerStyle}>
      <Image
        source={source}
        style={defaultStyle}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
      />
      
      {loading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(42, 42, 42, 0.8)',
          }}
        >
          {placeholder || (
            <>
              {showLoadingIndicator && (
                <ActivityIndicator size="small" color="#FFC107" />
              )}
              <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                Loading...
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;