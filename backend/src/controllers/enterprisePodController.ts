import { Request, Response } from 'express';
import { getTemplateBundleByProductId } from '../models/enterprisePodModel';

export async function getEnterprisePodTemplateByProduct(req: Request, res: Response) {
  try {
    const productId = parseInt(req.params.productId, 10);
    const tenantId = (req as any).tenantId || 1;

    if (isNaN(productId)) {
      return res.status(400).json({ success: false, error: 'Invalid productId parameter' });
    }

    const bundle = await getTemplateBundleByProductId(productId, tenantId);

    if (!bundle) {
      return res.status(200).json({
        success: true,
        hasPodTemplate: false,
        message: 'No enterprise POD template configured for this product. Fallback to single preview.',
        bundle: null,
      });
    }

    return res.status(200).json({
      success: true,
      hasPodTemplate: true,
      bundle,
    });
  } catch (error: any) {
    console.error('Error fetching Enterprise POD template:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
