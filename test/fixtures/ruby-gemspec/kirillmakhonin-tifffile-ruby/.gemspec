require File.expand_path("../lib/tifffile/version", __FILE__)

Gem::Specification.new do |gem|
  gem.name    = 'tifffile'
  gem.version = TiffFileVersion::VERSION
  gem.date    = '2016-03-22'

  gem.summary = "TIFF reader and writer"
  gem.description = ""

  gem.licenses = ['MIT']

  gem.authors  = ['Kirill Makhonin']
  gem.email    = 'kroks.rus@gmail.com'
  gem.homepage = 'https://github.com/kirillmakhonin/tifffile-ruby'

  gem.platform = Gem::Platform.local

  gem.files    = `git ls-files`.split($\) + Dir.glob("lib/**/*")

  gem.required_rubygems_version = ">= 1.3.6"

  gem.add_development_dependency "rspec", '~> 0'

  gem.require_path = 'lib'
  
end


