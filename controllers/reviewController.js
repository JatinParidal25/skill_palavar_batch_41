const Review = require('./../models/reviewModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const APIFeatures = require('./../utils/apiFeatures');

exports.setTourUserIds = (req, res, next) => {
  // Allow nested routes (from URL params)
  if (!req.body.tour) req.body.tour = req.params.tourId;
  // Also allow tourId and userId from request body
  if (!req.body.tour && req.body.tourId) req.body.tour = req.body.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  if (!req.body.user && req.body.userId) req.body.user = req.body.userId;

  // Clean up the original fields if they were converted
  delete req.body.tourId;
  delete req.body.userId;

  next();
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);

exports.getReviewsByUser = catchAsync(async (req, res, next) => {
  const filter = { user: req.params.userId };
  const features = new APIFeatures(Review.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const query = features.query.populate({
    path: 'tour',
    select: 'name'
  });
  const doc = await query;

  res.status(200).json({
    status: 'success',
    results: doc.length,
    data: {
      data: doc
    }
  });
});
