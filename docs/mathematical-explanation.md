# Mathematical Explanation — PCA Variance Explorer

## 1. Data Representation

A dataset with *n* samples and *p* features is stored as an *n × p* matrix **X**:

```
X = [ x₁₁  x₁₂  …  x₁ₚ ]
    [ x₂₁  x₂₂  …  x₂ₚ ]
    [  ⋮    ⋮   ⋱   ⋮  ]
    [ xₙ₁  xₙ₂  …  xₙₚ ]
```

## 2. Mean Centering

Column means:

```
μⱼ = (1/n) Σᵢ xᵢⱼ
```

Centered matrix:

```
X_c = X − 1 μᵀ
```

(where **1** is the all-ones vector of length *n*).

## 3. Optional Standardization

Sample standard deviation (Bessel-corrected):

```
sⱼ = √[ (1/(n−1)) Σᵢ (xᵢⱼ − μⱼ)² ]
```

Z-score matrix:

```
Zᵢⱼ = (xᵢⱼ − μⱼ) / sⱼ     (if sⱼ > 0; otherwise 0)
```

Standardized PCA is equivalent to performing PCA on the correlation matrix.

## 4. Sample Covariance Matrix

```
C = (1/(n−1)) X_cᵀ X_c
```

- **C** is *p × p*, symmetric, and positive semi-definite.
- Diagonal entries **Cⱼⱼ** are the sample variances of each feature.
- Off-diagonal entries are the sample covariances.

## 5. Eigenvalue Decomposition (Jacobi Method)

We solve

```
C v = λ v
```

for eigenvalues λ₁ ≥ λ₂ ≥ … ≥ λₚ ≥ 0 and orthonormal eigenvectors **v₁, …, vₚ**.

The Jacobi algorithm repeatedly applies plane rotations that annihilate the largest off-diagonal element until the matrix is numerically diagonal. The diagonal entries become the eigenvalues; the accumulated product of rotations yields the eigenvector matrix.

Properties verified in the application:

- **C vᵢ ≈ λᵢ vᵢ** (residual norm reported)
- **vᵢᵀ vⱼ ≈ 0** for i ≠ j (orthogonality)
- **‖vᵢ‖ = 1**

## 6. Explained Variance

```
Explained Variance Ratioᵢ = λᵢ / Σⱼ λⱼ
Cumulative Explained Variance(k) = Σᵢ₌₁ᵏ Explained Variance Ratioᵢ
```

Information loss when keeping *k* components:

```
Loss = 1 − Cumulative Explained Variance(k)
```

## 7. Projection onto Principal Components

Let **W** be the *p × k* matrix whose columns are the first *k* eigenvectors. The reduced representation is

```
X_reduced = X_processed W
```

(*n × k* matrix).

Because the eigenvectors are orthonormal, the inverse (approximate reconstruction) is

```
X̂ = X_reduced Wᵀ
```

When *k = p* the reconstruction is exact (up to floating-point error).

## 8. Numerical Notes

- Eigenvalues that are slightly negative due to round-off are clipped to zero for variance calculations.
- Features with near-zero variance are set to a constant zero after standardization to avoid division by zero.
- The application reports the maximum residual ‖C v − λ v‖ and the maximum off-diagonal of **Vᵀ V** so users can assess numerical quality.
