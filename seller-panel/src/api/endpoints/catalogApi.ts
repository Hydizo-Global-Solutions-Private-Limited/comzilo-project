import { baseApi } from '../baseApi';

export const catalogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // PRODUCTS
    getProducts: builder.query<any, { page?: number; limit?: number; search?: string; categoryId?: number; brandId?: number; collectionId?: number; status?: string; types?: string; productType?: string }>({
      query: (params) => ({
        url: '/store/products',
        params,
      }),
      providesTags: ['Product'],
    }),
    getProductById: builder.query<any, number | string>({
      query: (id) => `/store/products/${id}`,
      providesTags: ['Product'],
    }),
    createProduct: builder.mutation<any, any>({
      query: (data) => ({
        url: '/store/products',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Product'],
    }),
    updateProduct: builder.mutation<any, { id: number | string; data: any }>({
      query: ({ id, data }) => ({
        url: `/store/products/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Product'],
    }),
    deleteProduct: builder.mutation<any, number | string>({
      query: (id) => ({
        url: `/store/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Product'],
    }),
    restoreProduct: builder.mutation<any, number | string>({
      query: (id) => ({
        url: `/products/${id}/restore`,
        method: 'POST',
      }),
      invalidatesTags: ['Product'],
    }),

    // CATEGORIES
    getCategories: builder.query<any, { page?: number; limit?: number; search?: string }>({
      query: (params) => ({
        url: '/categories',
        params,
      }),
      providesTags: ['Category'],
    }),
    getCategoryTree: builder.query<any, void>({
      query: () => '/categories/tree',
      providesTags: ['Category'],
    }),
    createCategory: builder.mutation<any, any>({
      query: (data) => ({
        url: '/categories',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Category'],
    }),
    updateCategory: builder.mutation<any, { id: number | string; data: any }>({
      query: ({ id, data }) => ({
        url: `/categories/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Category'],
    }),
    deleteCategory: builder.mutation<any, number | string>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Category'],
    }),

    // BRANDS
    getBrands: builder.query<any, { page?: number; limit?: number; search?: string }>({
      query: (params) => ({
        url: '/brands',
        params,
      }),
      providesTags: ['Brand'],
    }),
    createBrand: builder.mutation<any, any>({
      query: (data) => ({
        url: '/brands',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Brand'],
    }),
    updateBrand: builder.mutation<any, { id: number | string; data: any }>({
      query: ({ id, data }) => ({
        url: `/brands/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Brand'],
    }),
    deleteBrand: builder.mutation<any, number | string>({
      query: (id) => ({
        url: `/brands/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Brand'],
    }),

    // COLLECTIONS
    getCollections: builder.query<any, { page?: number; limit?: number; search?: string }>({
      query: (params) => ({
        url: '/collections',
        params,
      }),
      providesTags: ['Collection'],
    }),
    createCollection: builder.mutation<any, any>({
      query: (data) => ({
        url: '/collections',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Collection'],
    }),
    updateCollection: builder.mutation<any, { id: number | string; data: any }>({
      query: ({ id, data }) => ({
        url: `/collections/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Collection'],
    }),
    deleteCollection: builder.mutation<any, number | string>({
      query: (id) => ({
        url: `/collections/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Collection'],
    }),

    // TAGS
    getTags: builder.query<any, { page?: number; limit?: number; search?: string }>({
      query: (params) => ({
        url: '/tags',
        params,
      }),
      providesTags: ['Tag'],
    }),
    createTag: builder.mutation<any, any>({
      query: (data) => ({
        url: '/tags',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Tag'],
    }),
    updateTag: builder.mutation<any, { id: number | string; data: any }>({
      query: ({ id, data }) => ({
        url: `/tags/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Tag'],
    }),
    deleteTag: builder.mutation<any, number | string>({
      query: (id) => ({
        url: `/tags/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Tag'],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useRestoreProductMutation,
  useGetCategoriesQuery,
  useGetCategoryTreeQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetBrandsQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
  useGetCollectionsQuery,
  useCreateCollectionMutation,
  useUpdateCollectionMutation,
  useDeleteCollectionMutation,
  useGetTagsQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
} = catalogApi;
