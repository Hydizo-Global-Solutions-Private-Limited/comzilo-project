import { baseApi } from './baseApi';

export const catalogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<any, { page?: number; limit?: number; search?: string; categoryId?: number; types?: string; minPrice?: number; maxPrice?: number; tenant_id?: number; store_id?: number; store?: string; sortBy?: string; sort?: string; marketplace?: boolean | string }>({
      query: (params) => ({
        url: '/products',
        params,
      }),
      providesTags: ['Product'],
    }),
    getProductById: builder.query<any, number | string>({
      query: (id) => `/products/${id}`,
      providesTags: ['Product'],
    }),
    getCategories: builder.query<any, void>({
      query: () => '/categories',
      providesTags: ['Category'],
    }),
    getOrders: builder.query<any, void>({
      query: () => '/orders',
      providesTags: ['Order'],
    }),
    createOrder: builder.mutation<any, any>({
      query: (data) => ({
        url: '/orders',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Order'],
    }),
    getProductReviews: builder.query<any, number | string>({
      query: (productId) => `/products/${productId}/reviews`,
      providesTags: (result, error, id) => [{ type: 'Product', id: `REVIEWS_${id}` }],
    }),
    submitProductReview: builder.mutation<any, { productId: number | string; rating: number; title?: string; comment: string; customerName?: string; customerEmail?: string }>({
      query: ({ productId, ...data }) => ({
        url: `/products/${productId}/reviews`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { productId }) => [{ type: 'Product', id: `REVIEWS_${productId}` }, 'Product'],
    }),
    markReviewHelpful: builder.mutation<any, number | string>({
      query: (reviewId) => ({
        url: `/products/reviews/${reviewId}/helpful`,
        method: 'POST',
      }),
      invalidatesTags: ['Product'],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useGetCategoriesQuery,
  useGetOrdersQuery,
  useCreateOrderMutation,
  useGetProductReviewsQuery,
  useSubmitProductReviewMutation,
  useMarkReviewHelpfulMutation,
} = catalogApi;
