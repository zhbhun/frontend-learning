#ifdef __cplusplus
extern "C" {
#endif

void bmm(double* matrixA, double* matrixB, double* matrixC, int length, int blockSize ) {
  unsigned int block = blockSize * (length/blockSize);
  double sum;

  for (unsigned int kk = 0; kk < block; kk += blockSize) {
    for (unsigned int jj = 0; jj < block; jj += blockSize) {
      for (unsigned int i = 0; i < length; i++) {
        for (unsigned int j = jj; j < jj + blockSize; j++) {
          sum = matrixC[i*length+j];
          for (unsigned int k = kk; k < kk + blockSize; k++) {
            sum += matrixA[i*length+k] * matrixB[k*length+j];
          }
          matrixC[i*length+j] += sum;
        }
      }
    }
  }
}

void mmmijk(double* matrixA, double* matrixB, double* matrixC, int length) {
  for(unsigned int i = 0; i < length; i++){
    for(unsigned int j = 0; j < length; j++) {
      for(unsigned int k = 0; k < length; k++) {
        matrixC[i * length + j] += (matrixA[i * length + k] * matrixB[j * length + k]);
      }
    }
  }
}

void mmmkji(double* matrixA, double* matrixB, double* matrixC, int length) {
  for(unsigned int k = 0; k < length; k++) {
    for(unsigned int j = 0; j < length; j++) {
      for(unsigned int i = 0; i < length; i++){
        matrixC[i * length + j] += (matrixA[i * length + k] * matrixB[j * length + k]);
      }
    }
  }
}

#ifdef __cplusplus
}
#endif
