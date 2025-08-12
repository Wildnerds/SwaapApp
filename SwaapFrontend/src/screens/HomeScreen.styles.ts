import { StyleSheet, Dimensions } from 'react-native';
import COLORS from '@constants/colors';

const screenWidth = Dimensions.get('window').width;
const contentWidth = screenWidth - 32; // consistent width for all sections except search bar

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  // Search Bar
 searchBar: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#fff',
  marginHorizontal: 16,
  marginVertical: 10,
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 20,
  borderWidth: 4,           // ✅ Add this
  borderColor: '#ddd',        // ✅ Or use COLORS.lightGray if defined
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 10,
},

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },

  // Flash Sale
  flashBanner: {
    backgroundColor: COLORS.black,
    width: contentWidth,
    alignSelf: 'center',
    marginBottom: 10,
    padding: 2,
    
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flashTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  timeBoxes: {
    flexDirection: 'row',
    gap: 4,
  },
  timeBox: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.gold,
  },

  // Carousel
  adCard: {
    height: 90,
    width: contentWidth,
    alignSelf: 'center',
    // borderRadius: 12,
    overflow: 'hidden',
    marginTop: 1,
    marginBottom: 2,
    marginLeft: -33,
  },
  adImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // New Category Section
  newCategoryContainer: {
    gap: 1,
  },
  newCategoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 55,
    height: 70,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginLeft: 9,
    marginRight: 5,
    elevation: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  selectedCategoryCard: {
    backgroundColor: COLORS.gold,
    elevation: 3,
    shadowOpacity: 0.15,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  selectedIconContainer: {
    backgroundColor: '#fff',
  },
  categoryIcon: {
    fontSize: 16,
  },
  newCategoryText: {
    fontSize: 7,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 10,
  },
  selectedCategoryText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  // Products Section
  productsHeader: {
    width: contentWidth,
    alignSelf: 'center',
    marginBottom: 4,
    marginTop: -2,
  },
  productsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },

  productList: {
    width: contentWidth,
    alignSelf: 'center',
    paddingBottom: 100,
    marginTop: 2,
  },
  productCard: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 6,
    // borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  saleBadge: {
    backgroundColor: '#ff4444',
  },
  swapBadge: {
    backgroundColor: '#4CAF50',
  },
  bothBadge: {
    backgroundColor: '#FF9800',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  favoriteIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    padding: 12,
    paddingBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.gold,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  // Utility styles
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // Legacy category styles
  categoryScroll: {
    marginVertical: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#fff',
    elevation: 1,
  },
  selectedCategory: {
    backgroundColor: COLORS.gold,
  },
  categoryText: {
    fontSize: 14,
    color: '#333',
  },
  selectedText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
