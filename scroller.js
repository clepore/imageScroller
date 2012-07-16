/*
 * Copyright (c) 2011 The Wonderfactory, http://www.thewonderfactory.com
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * @fileOverview A jQuery scroller plugin for a list of items.
 * @version 0.1
 * @author Christopher Lepore <technology@thewonderfactory.com> 
 */


(function($) {
  var methods = {
    init: function(options) {
      options = $.extend({}, $.fn.scroller.defaults, options);

      return this.each(function() {
        var self = $(this);

        // Make sure the browser is compatible with the hashchange event when requested
        if ("onhashchange" in window && options.hashAsPageNumber) {
          options.hashAsPageNumber = true;
        }

        self.data('scroller',{
          options: options,
          nextButton: $(options.nextButton),
          previousButton: $(options.previousButton),
          scrollableUl: $(options.scrollableUl),
          previousUrl: location.pathname
        });

        var data = self.data('scroller');

        // If the scroller is loaded already, then ignore init
        if (data.scrollerLoaded) {
          return;
        }
        data.scrollerLoaded = true;

        // Grab scroll amount from li width
        data.scrollAmount = data.scrollableUl.find('li').outerWidth(true);

        //Resize parent of ul to show numOfPicsVisibleVisible
        var newWidth = data.scrollAmount * data.options.numOfPicsVisible;
        self.css({
          'width': newWidth + 'px',
          'overflow' : 'hidden'
        });
        
       //Resize UL to be the right length
        newWidth = data.scrollAmount * data.scrollableUl.children().length;
        data.scrollableUl.css('width', newWidth + 'px' );
      
        // Activate buttons
        data.nextButton.bind('click', function(event, currentIdx) {
          methods.gotoNext.call(self, currentIdx);
          return false;
        });

        data.previousButton.bind('click', function(event, currentIdx) {
          methods.gotoPrevious.call(self, currentIdx);
          return false;
        });
        
        // Bind to the hash event if using hashes as page numbers
        if (data.options.hashAsPageNumber) {
          $(window).bind( 'hashchange', function(e) {
            var index =  functions.getPositionFromHash(data.previousUrl);
            if (index != null) {
              methods.gotoIndex.call(self, index, true);
              
              $(data.options.paginationContainer)
                .find('.active')
                .removeClass('active')
                .end()
                .find('[href="#' + (index + 1) + '"]')
                .addClass('active');
            }
          });
        }

        // Start at zero unless hash says otherwise and go to that page without animation
        var index = (data.options.hashAsPageNumber) ? functions.getPositionFromHash(data.previousUrl) : 0;
        
        // Load the first page's images
        if (data.options.loadImagesLazily) {
          methods.lazyLoadImages.call(self, index, 1);
        }
        methods.gotoIndex.call(self, index, false);
      });
    },

    gotoIndex: function(index, animateScroll){
      var self = $(this),
        data = self.data('scroller'),
        nextButton = data.nextButton,
        previousButton = data.previousButton,
        scrollableUl = data.scrollableUl,
        scrollAmount = data.scrollAmount,
        numOfPicsVisible = data.options.numOfPicsVisible,
        numberOfItems = scrollableUl.children().size();
        
      // Clamp the index
      if (index <= 0) { 
        index = 0;
        previousButton.hide();
      } else {
        previousButton.show();
      }

      if (index >= numberOfItems - numOfPicsVisible) {
        index = numberOfItems - numOfPicsVisible;
        nextButton.hide();
      } else {
        nextButton.show();
      }
      
      // Cancel setup if there aren't enough items to scroll
      if (numberOfItems < numOfPicsVisible) {
        return false;
      } 
      
      // The position to scroll to and then scroll to it
      var scrollX = index * scrollAmount;
      if (animateScroll) {
        opts = {
          'duration': 400
        }
        
        if (data.options.loadImagesLazily) {
          opts.complete = function() {
            methods.lazyLoadImages.call(self, index, 1);
          }
        }
        
        // Load other page's images after animate
        scrollableUl.animate({ 'left': -scrollX }, opts);
      } else {
        scrollableUl.css({ 'left': -scrollX });
      }
      
      // Set the url hash and add one to avoid counting with a 0 index
      if (data.options.hashAsPageNumber && index > 0) {
        window.location.hash = index + 1;
      }

      // Store the scrolled-to index
      data.currentIndex = index;
    },
  
    gotoPrevious: function(currentIndex) {
      var self = $(this),
        data = self.data('scroller');
        
      if(currentIndex == null){
        currentIndex = data.currentIndex;
      }
      
      if (data.options.hashAsPageNumber) {
        // +1 to get the current index to what the user sees, then -1 to go to previous = 0
        window.location.hash = (currentIndex > 0) ? currentIndex : 0;
      } else {
        methods.gotoIndex.call(self, currentIndex - 1, true);
      }
    },
  
    gotoNext: function(currentIndex) {
      var self = $(this),
        data = self.data('scroller'),
        numberOfItems = data.scrollableUl.children().size();
        
      if (currentIndex == null){
        currentIndex = data.currentIndex;
      }
      
      if (data.options.hashAsPageNumber) {
        // +1 because the user doesn't see a 0-scale, and +1 again to get next page = + 2
        window.location.hash = (currentIndex < numberOfItems) ? currentIndex + 2 : numberOfItems;
      } else {
        methods.gotoIndex.call(self, currentIndex + 1, true);
      }
    },

    lazyLoadImages: function(currentIndex, scope) {
      // Add the img src to each img tag for viewing -
      var self = $(this),
        data = self.data('scroller'),
        scrollableUl = data.scrollableUl,
        max = scrollableUl.children('li').size(),
        images = [];
        
      // By default get 1 li before and 1 li after the current li.
      var startPage = currentIndex - scope,
        endPage = currentIndex + scope;
      
      // If we are at the beginning, get the next page
      if (currentIndex == 0) {
        startPage = 0;
        endPage = 1;
      }
      
      // If we are at the end, get the previous page
      if (currentIndex == max) {
        startPage = max - scope;
        endPage = max;
      }

      // Loop through page range
      for (var i = startPage; i <= endPage; i++) {
        li = $(scrollableUl.children('li')[i]);
        
        // Set src attribute per image
        $.each(li.find('img[data-src]'), function() {
          var elem = $(this);
          elem.attr('src', elem.attr('data-src')).removeAttr('data-src');
        });
      }
    }
  };

  var functions = {
    getPositionFromHash: function(previousUrl) {
      // Compare current url to previous url
      if (location.pathname == previousUrl) {
        var hash = window.location.hash;
        if (hash != '') {
          var afterHash = hash.replace( /^#/, '' );
          var afterHashAsNum = parseInt(afterHash);
          if (!isNaN(afterHashAsNum)) {
            // Subtract 1 so it scrolls to 0 scale
            return (afterHashAsNum - 1);
          }
        }
      }
      return null;
    }
  };
  
  /**
   * <p>Scroller plugin for a carousel of items.</p>
   *
   * @example Example goes here.
   *
   * @param nextButton - the elem to move to the next item
   * @param previousButton - the elem that moves to the prev item
   * @param scrollableUl - the list to be scrolled
   * @param numOfPicsVisible - the number of items to show at once
   * @param hashAsPageNumber - write the page number as a hash in the url
   * @param loadImagesLazily - loads images on demand within a page range
   *
   */
  jQuery.fn.scroller = function(method) {
    // Method calling logic
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || ! method) {
      return methods.init.apply(this, arguments);
    } else {
      $.error('Method ' +  method + ' does not exist');
    }
  };
  
  jQuery.fn.scroller.defaults = {
    nextButton: $(),
    previousButton: $(),
    scrollableUl: $(),
    numOfPicsVisible: 1,
    hashAsPageNumber: false,
    paginationContainer: $(),
    loadImagesLazily: true
  };
})(jQuery);