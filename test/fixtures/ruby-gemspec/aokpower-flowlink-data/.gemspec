# -*- encoding: utf-8 -*-
lib = File.expand_path('../lib/', __FILE__)
$:.unshift lib unless $:.include?(lib)

require 'flowlink_data/version'

Gem::Specification.new do |s|
  s.name = 'flowlink_data'
  s.version = Flowlink::VERSION
  s.platform = Gem::Platform::RUBY
  s.authors = ['Cooper LeBrun']
  s.email = ['cooperlebrun@gmail.com']
  s.homepage = 'https://github.com/aokpower/flowlink_data'

  s.summary = 'Constructor object bases for use with flowlink.io'
  s.description = 'A framework for getting Flowlink objects from other sources. For example:
  class Distributor::Product < Flowlink::Product
    def sku(hashable)
      # code that picks sku data out of a hashable object.
    end
  end
  Distributor::Product.new(CSV::Row).to_message #=> A bunch of NotImplementedError because just a sku is an invalid product'

  s.files = Dir.glob('{bin,lib}/**/*') # + %w(LICENSE README.md)
  # ROADMAP.md CHANGELOG.md

  s.license = 'MIT'

  s.require_path = 'lib'
end
