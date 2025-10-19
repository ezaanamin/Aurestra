import { configureStore } from '@reduxjs/toolkit';
import APISliceReducer from '../API/slice/API'; 

export const store = configureStore({
  reducer: {
    
    API: APISliceReducer, 
    
    
  },
});